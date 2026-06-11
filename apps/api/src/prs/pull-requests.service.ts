import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import type {
  CreatePRCommentRequest,
  CreatePRReviewRequest,
  MergePreviewResponse,
  MergePullRequestResponse,
  PullRequestCommitsResponse,
  PullRequestDetail,
  PullRequestListResponse,
  PullRequestStatus,
} from "@svnhub/shared";
import {
  DEFAULT_BRANCH_UI,
  uiRefToSvnPath,
} from "@svnhub/shared";

import { AuditService } from "../audit/audit.service";
import { BranchesService } from "../branches/branches.service";
import { PrismaService } from "../prisma/prisma.service";
import { WebhooksService } from "../webhooks/webhooks.service";
import { SvnEngineService } from "../svn-engine/svn-engine.service";
import { SvnMergeService } from "../svn-engine/svn-merge.service";
import {
  countApprovals,
  evaluateMergeEligibility,
  latestReviewDecisions,
} from "./merge-eligibility";

type PullRequestWithRelations = Awaited<ReturnType<PullRequestsService["loadPullRequest"]>>;

@Injectable()
export class PullRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly svnEngine: SvnEngineService,
    private readonly svnMerge: SvnMergeService,
    private readonly branchesService: BranchesService,
    private readonly auditService: AuditService,
    private readonly webhooksService: WebhooksService,
  ) {}

  async list(
    slug: string,
    status?: PullRequestStatus,
  ): Promise<PullRequestListResponse> {
    const repo = await this.requireRepo(slug);
    const where = {
      repositoryId: repo.id,
      ...(status ? { status } : {}),
    };

    const [pullRequests, total] = await Promise.all([
      this.prisma.pullRequest.findMany({
        where,
        include: { author: true },
        orderBy: { number: "desc" },
      }),
      this.prisma.pullRequest.count({ where }),
    ]);

    return {
      pullRequests: pullRequests.map((pr) => this.toSummary(pr)),
      total,
    };
  }

  async create(
    slug: string,
    input: {
      sourceRef: string;
      targetRef?: string;
      title: string;
      description?: string;
    },
    authorId: string,
  ): Promise<PullRequestDetail> {
    const repo = await this.requireRepo(slug);
    const targetRef = input.targetRef ?? DEFAULT_BRANCH_UI;
    const sourcePath = uiRefToSvnPath(input.sourceRef, "branch");
    const targetPath = uiRefToSvnPath(targetRef, "branch");

    if (sourcePath === targetPath) {
      throw new BadRequestException("Source and target must differ");
    }

    const existingOpen = await this.prisma.pullRequest.findFirst({
      where: {
        repositoryId: repo.id,
        sourcePath,
        targetPath,
        status: "OPEN",
      },
    });
    if (existingOpen) {
      throw new ConflictException("An open pull request already exists for this branch pair");
    }

    const maxNumber = await this.prisma.pullRequest.aggregate({
      where: { repositoryId: repo.id },
      _max: { number: true },
    });
    const number = (maxNumber._max.number ?? 0) + 1;

    const pullRequest = await this.prisma.pullRequest.create({
      data: {
        number,
        repositoryId: repo.id,
        sourceRef: input.sourceRef,
        sourcePath,
        targetRef,
        targetPath,
        title: input.title,
        description: input.description ?? null,
        authorId,
      },
      include: this.detailInclude(),
    });

    await this.auditService.log({
      userId: authorId,
      repositoryId: repo.id,
      action: "pr.create",
      resourceType: "pull_request",
      resourceId: String(number),
      metadata: { sourceRef: input.sourceRef, targetRef },
    });

    const preview = await this.loadPreview(pullRequest);
    return this.toDetail(pullRequest, preview);
  }

  async getByNumber(slug: string, number: number): Promise<PullRequestDetail> {
    const repo = await this.requireRepo(slug);
    const pullRequest = await this.loadPullRequest(repo.id, number);
    const preview = await this.loadPreview(pullRequest);
    return this.toDetail(pullRequest, preview);
  }

  async previewMerge(slug: string, number: number): Promise<MergePreviewResponse> {
    const repo = await this.requireRepo(slug);
    const pullRequest = await this.loadPullRequest(repo.id, number);
    if (pullRequest.status !== "OPEN") {
      throw new BadRequestException("Preview is only available for open pull requests");
    }
    return this.previewMergeInternal(pullRequest);
  }

  async getCommits(slug: string, number: number): Promise<PullRequestCommitsResponse> {
    const repo = await this.requireRepo(slug);
    const pullRequest = await this.loadPullRequest(repo.id, number);
    const commits = await this.svnEngine.log(repo.svnPath, {
      path: pullRequest.sourcePath,
      limit: 100,
    });

    return { commits };
  }

  async addComment(
    slug: string,
    number: number,
    input: CreatePRCommentRequest,
    authorId: string,
  ): Promise<PullRequestDetail> {
    const repo = await this.requireRepo(slug);
    const pullRequest = await this.loadPullRequest(repo.id, number);

    if (input.path) {
      if (!input.line || !input.side) {
        throw new BadRequestException("Inline comments require path, line and side");
      }
    }

    await this.prisma.pRComment.create({
      data: {
        pullRequestId: pullRequest.id,
        authorId,
        body: input.body,
        path: input.path ?? null,
        line: input.line ?? null,
        side: input.side ?? null,
      },
    });

    const updated = await this.loadPullRequest(repo.id, number);
    const preview = await this.loadPreview(updated);
    return this.toDetail(updated, preview);
  }

  async addReview(
    slug: string,
    number: number,
    input: CreatePRReviewRequest,
    authorId: string,
  ): Promise<PullRequestDetail> {
    const repo = await this.requireRepo(slug);
    const pullRequest = await this.loadPullRequest(repo.id, number);

    if (pullRequest.authorId === authorId) {
      throw new BadRequestException("Authors cannot review their own pull request");
    }

    await this.prisma.pRReview.upsert({
      where: {
        pullRequestId_authorId: {
          pullRequestId: pullRequest.id,
          authorId,
        },
      },
      create: {
        pullRequestId: pullRequest.id,
        authorId,
        decision: input.decision,
        body: input.body ?? null,
      },
      update: {
        decision: input.decision,
        body: input.body ?? null,
      },
    });

    const updated = await this.loadPullRequest(repo.id, number);
    const preview = await this.loadPreview(updated);
    return this.toDetail(updated, preview);
  }

  async merge(
    slug: string,
    number: number,
    actorUserId: string,
    deleteSourceBranch = false,
  ): Promise<MergePullRequestResponse> {
    const repo = await this.requireRepo(slug);
    const pullRequest = await this.loadPullRequest(repo.id, number);
    const preview = await this.loadPreview(pullRequest);
    const policy = await this.ensurePolicy(repo.id);
    const eligibility = this.buildEligibility(pullRequest, preview, policy.minApprovals);

    if (!eligibility.canMerge) {
      throw new BadRequestException(eligibility.reasons.join("; "));
    }

    const actor = await this.prisma.user.findUnique({ where: { id: actorUserId } });
    if (!actor) {
      throw new NotFoundException("User not found");
    }

    const message = `Merge pull request #${pullRequest.number}: ${pullRequest.title}`;
    const result = await this.svnMerge.executeMerge(
      repo.svnPath,
      pullRequest.sourcePath,
      pullRequest.targetPath,
      message,
      actor.username,
    );

    const merged = await this.prisma.pullRequest.update({
      where: { id: pullRequest.id },
      data: {
        status: "MERGED",
        mergeRevision: result.mergeRevision,
        mergedAt: new Date(),
        mergedById: actorUserId,
      },
      include: this.detailInclude(),
    });

    if (deleteSourceBranch && pullRequest.sourceRef !== DEFAULT_BRANCH_UI) {
      await this.branchesService.deleteBranch(slug, pullRequest.sourceRef, actorUserId);
    }

    await this.auditService.log({
      userId: actorUserId,
      repositoryId: repo.id,
      action: "pr.merge",
      resourceType: "pull_request",
      resourceId: String(number),
      metadata: {
        mergeRevision: result.mergeRevision,
        deleteSourceBranch,
      },
    });

    await this.webhooksService.enqueueDeliveries("PR_MERGED", {
      repositoryId: repo.id,
      repositorySlug: repo.slug,
      data: {
        pullRequestNumber: number,
        mergeRevision: result.mergeRevision,
        sourceRef: pullRequest.sourceRef,
        targetRef: pullRequest.targetRef,
      },
    });

    return {
      mergeRevision: result.mergeRevision,
      pullRequest: await this.toDetail(merged, preview),
    };
  }

  async updateStatus(
    slug: string,
    number: number,
    status: "OPEN" | "CLOSED",
    actorUserId?: string,
  ): Promise<PullRequestDetail> {
    const repo = await this.requireRepo(slug);
    const pullRequest = await this.loadPullRequest(repo.id, number);

    if (pullRequest.status === "MERGED") {
      throw new BadRequestException("Merged pull requests cannot be updated");
    }

    const updated = await this.prisma.pullRequest.update({
      where: { id: pullRequest.id },
      data: {
        status,
        closedAt: status === "CLOSED" ? new Date() : null,
      },
      include: this.detailInclude(),
    });

    await this.auditService.log({
      userId: actorUserId,
      repositoryId: repo.id,
      action: status === "OPEN" ? "pr.reopen" : "pr.close",
      resourceType: "pull_request",
      resourceId: String(number),
    });

    const preview = await this.loadPreview(updated);
    return this.toDetail(updated, preview);
  }

  private async loadPreview(
    pullRequest: PullRequestWithRelations,
  ): Promise<MergePreviewResponse | null> {
    if (pullRequest.status !== "OPEN") {
      return null;
    }
    return this.previewMergeInternal(pullRequest);
  }

  private async previewMergeInternal(
    pullRequest: PullRequestWithRelations,
  ): Promise<MergePreviewResponse> {
    return this.svnMerge.previewMerge(
      pullRequest.repository.svnPath,
      pullRequest.sourcePath,
      pullRequest.targetPath,
    );
  }

  private buildEligibility(
    pullRequest: PullRequestWithRelations,
    preview: MergePreviewResponse | null,
    minApprovals: number,
  ) {
    return evaluateMergeEligibility({
      status: pullRequest.status,
      hasConflicts: preview?.hasConflicts ?? false,
      approvalCount: countApprovals(pullRequest.reviews),
      minApprovals,
      latestReviewDecisions: latestReviewDecisions(pullRequest.reviews),
      statusChecks: pullRequest.statusChecks.map((check) => ({ status: check.status })),
    });
  }

  private detailInclude() {
    return {
      author: true,
      mergedBy: true,
      comments: { include: { author: true }, orderBy: { createdAt: "asc" as const } },
      reviews: { include: { author: true }, orderBy: { createdAt: "asc" as const } },
      statusChecks: { orderBy: { createdAt: "asc" as const } },
      repository: true,
    };
  }

  private async loadPullRequest(repositoryId: string, number: number) {
    const pullRequest = await this.prisma.pullRequest.findUnique({
      where: { repositoryId_number: { repositoryId, number } },
      include: this.detailInclude(),
    });
    if (!pullRequest) {
      throw new NotFoundException("Pull request not found");
    }
    return pullRequest;
  }

  private toSummary(pullRequest: {
    id: string;
    number: number;
    title: string;
    status: PullRequestStatus;
    sourceRef: string;
    targetRef: string;
    mergeRevision: number | null;
    createdAt: Date;
    updatedAt: Date;
    author: {
      id: string;
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
    };
  }) {
    return {
      id: pullRequest.id,
      number: pullRequest.number,
      title: pullRequest.title,
      status: pullRequest.status,
      sourceRef: pullRequest.sourceRef,
      targetRef: pullRequest.targetRef,
      author: this.toAuthor(pullRequest.author),
      mergeRevision: pullRequest.mergeRevision,
      createdAt: pullRequest.createdAt.toISOString(),
      updatedAt: pullRequest.updatedAt.toISOString(),
    };
  }

  private async toDetail(
    pullRequest: PullRequestWithRelations,
    preview: MergePreviewResponse | null,
  ): Promise<PullRequestDetail> {
    const policy = await this.ensurePolicy(pullRequest.repositoryId);
    const eligibility = this.buildEligibility(pullRequest, preview, policy.minApprovals);

    return {
      ...this.toSummary(pullRequest),
      description: pullRequest.description,
      sourcePath: pullRequest.sourcePath,
      targetPath: pullRequest.targetPath,
      mergedAt: pullRequest.mergedAt?.toISOString() ?? null,
      closedAt: pullRequest.closedAt?.toISOString() ?? null,
      mergedBy: pullRequest.mergedBy ? this.toAuthor(pullRequest.mergedBy) : null,
      comments: pullRequest.comments.map((comment) => ({
        id: comment.id,
        body: comment.body,
        path: comment.path,
        line: comment.line,
        side: comment.side,
        author: this.toAuthor(comment.author),
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
      })),
      reviews: pullRequest.reviews.map((review) => ({
        id: review.id,
        decision: review.decision,
        body: review.body,
        author: this.toAuthor(review.author),
        createdAt: review.createdAt.toISOString(),
        updatedAt: review.updatedAt.toISOString(),
      })),
      statusChecks: pullRequest.statusChecks.map((check) => ({
        id: check.id,
        name: check.name,
        status: check.status,
        targetRevision: check.targetRevision,
        detailsUrl: check.detailsUrl,
        createdAt: check.createdAt.toISOString(),
        updatedAt: check.updatedAt.toISOString(),
      })),
      mergeEligibility: eligibility,
    };
  }

  private toAuthor(user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  }) {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    };
  }

  private async requireRepo(slug: string) {
    const repo = await this.prisma.repository.findUnique({ where: { slug } });
    if (!repo) {
      throw new NotFoundException("Repository not found");
    }
    return repo;
  }

  private async ensurePolicy(repositoryId: string) {
    return this.prisma.repoPolicy.upsert({
      where: { repositoryId },
      create: { repositoryId },
      update: {},
    });
  }
}
