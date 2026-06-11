import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";

import type {
  CreateIssueCommentRequest,
  CreateIssueRequest,
  CreateLabelRequest,
  IssueDetail,
  IssueListResponse,
  IssueStatus,
  IssueTimelineEntry,
  LabelListResponse,
  UpdateIssueCommentRequest,
  UpdateIssueRequest,
  UpdateLabelRequest,
} from "@svnhub/shared";
import { hasMinimumRepoRole, maxRepoRole } from "../auth/repo-role-level";
import type { RepoRole } from "@svnhub/shared";

import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { WebhooksService } from "../webhooks/webhooks.service";

type IssueWithRelations = Awaited<ReturnType<IssuesService["loadIssue"]>>;

@Injectable()
export class IssuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly webhooksService: WebhooksService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async list(
    slug: string,
    query: {
      status?: IssueStatus;
      label?: string;
      assignee?: string;
      author?: string;
      search?: string;
      sort?: "createdAt" | "updatedAt";
      order?: "asc" | "desc";
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<IssueListResponse> {
    const repo = await this.requireRepo(slug);
    const limit = query.limit ?? 30;
    const offset = query.offset ?? 0;
    const order = query.order ?? "desc";
    const sort = query.sort ?? "createdAt";

    const where: Prisma.IssueWhereInput = {
      repositoryId: repo.id,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? { title: { contains: query.search, mode: "insensitive" } }
        : {}),
      ...(query.author
        ? { author: { username: { equals: query.author, mode: "insensitive" } } }
        : {}),
      ...(query.assignee
        ? { assignee: { username: { equals: query.assignee, mode: "insensitive" } } }
        : {}),
      ...(query.label
        ? {
            labels: {
              some: {
                label: { name: { equals: query.label, mode: "insensitive" } },
              },
            },
          }
        : {}),
    };

    const [issues, total, openCount] = await Promise.all([
      this.prisma.issue.findMany({
        where,
        include: this.summaryInclude(),
        orderBy: { [sort]: order },
        skip: offset,
        take: limit,
      }),
      this.prisma.issue.count({ where }),
      this.prisma.issue.count({
        where: { repositoryId: repo.id, status: "OPEN" },
      }),
    ]);

    return {
      issues: issues.map((issue) => this.toSummary(issue)),
      total,
      openCount,
    };
  }

  async create(
    slug: string,
    input: CreateIssueRequest,
    authorId: string,
  ): Promise<IssueDetail> {
    const repo = await this.requireRepo(slug);
    await this.validateAssignee(repo.id, input.assigneeId);
    await this.validateLabels(repo.id, input.labelIds ?? []);

    const issue = await this.createWithNextNumber({
      repositoryId: repo.id,
      title: input.title,
      body: input.body ?? null,
      authorId,
      assigneeId: input.assigneeId ?? null,
      labelIds: input.labelIds ?? [],
    });

    await this.auditService.log({
      userId: authorId,
      repositoryId: repo.id,
      action: "issue.create",
      resourceType: "issue",
      resourceId: String(issue.number),
      metadata: { title: input.title },
    });

    await this.webhooksService.enqueueDeliveries("ISSUE_OPENED", {
      repositoryId: repo.id,
      repositorySlug: repo.slug,
      data: {
        issueNumber: issue.number,
        title: issue.title,
        authorId,
      },
    });

    if (input.assigneeId && input.assigneeId !== authorId) {
      const author = await this.prisma.user.findUnique({
        where: { id: authorId },
        select: { username: true },
      });
      if (author) {
        await this.notificationsService.notifyIssueAssigned({
          repositorySlug: repo.slug,
          issueNumber: issue.number,
          issueTitle: issue.title,
          assigneeId: input.assigneeId,
          assignerId: authorId,
          assignerUsername: author.username,
        });
      }
    }

    return this.toDetail(issue);
  }

  async getByNumber(slug: string, number: number): Promise<IssueDetail> {
    const repo = await this.requireRepo(slug);
    const issue = await this.loadIssue(repo.id, number);
    return this.toDetail(issue);
  }

  async update(
    slug: string,
    number: number,
    input: UpdateIssueRequest,
    actorUserId: string,
  ): Promise<IssueDetail> {
    const repo = await this.requireRepo(slug);
    const issue = await this.loadIssue(repo.id, number);
    const actorRole = await this.resolveEffectiveRole(actorUserId, repo.id);

    if (input.title !== undefined || input.body !== undefined) {
      const isAuthor = issue.authorId === actorUserId;
      const isMaintainer =
        actorRole !== null && hasMinimumRepoRole(actorRole, "MAINTAINER");
      if (!isAuthor && !isMaintainer) {
        throw new ForbiddenException("Only the author or maintainers can edit title/body");
      }
    }

    if (input.assigneeId !== undefined) {
      await this.validateAssignee(repo.id, input.assigneeId ?? undefined);
    }

    if (input.labelIds !== undefined) {
      await this.validateLabels(repo.id, input.labelIds);
    }

    const previousStatus = issue.status;
    const previousAssigneeId = issue.assigneeId;
    const previousLabelIds = issue.labels.map((entry) => entry.labelId);

    const data: Prisma.IssueUpdateInput = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.body !== undefined) data.body = input.body;
    if (input.assigneeId !== undefined) {
      data.assignee = input.assigneeId
        ? { connect: { id: input.assigneeId } }
        : { disconnect: true };
    }
    if (input.status !== undefined) {
      data.status = input.status;
      data.closedAt = input.status === "CLOSED" ? new Date() : null;
      if (input.status === "OPEN") {
        data.closedByPrNumber = null;
      }
    }

    await this.prisma.issue.update({
      where: { id: issue.id },
      data,
      include: this.detailInclude(),
    });

    if (input.labelIds !== undefined) {
      await this.syncIssueLabels(issue.id, input.labelIds);
    }

    const reloaded = await this.loadIssue(repo.id, number);
    await this.recordUpdateSideEffects({
      repo,
      issue: reloaded,
      actorUserId,
      previousStatus,
      previousAssigneeId,
      previousLabelIds,
      input,
    });

    return this.toDetail(reloaded);
  }

  async addComment(
    slug: string,
    number: number,
    input: CreateIssueCommentRequest,
    authorId: string,
  ): Promise<IssueDetail> {
    const repo = await this.requireRepo(slug);
    const issue = await this.loadIssue(repo.id, number);

    const comment = await this.prisma.issueComment.create({
      data: {
        issueId: issue.id,
        authorId,
        body: input.body,
      },
    });

    await this.auditService.log({
      userId: authorId,
      repositoryId: repo.id,
      action: "issue.comment.create",
      resourceType: "issue",
      resourceId: String(number),
    });

    await this.webhooksService.enqueueDeliveries("ISSUE_COMMENTED", {
      repositoryId: repo.id,
      repositorySlug: repo.slug,
      data: {
        issueNumber: number,
        authorId,
      },
    });

    const author = await this.prisma.user.findUnique({
      where: { id: authorId },
      select: { username: true },
    });
    if (author) {
      await this.notificationsService.notifyMentions({
        repositorySlug: repo.slug,
        context: "issue",
        contextNumber: number,
        contextTitle: issue.title,
        commentId: comment.id,
        authorId,
        authorUsername: author.username,
        body: input.body,
      });
    }

    const reloaded = await this.loadIssue(repo.id, number);
    return this.toDetail(reloaded);
  }

  async updateComment(
    slug: string,
    number: number,
    commentId: string,
    input: UpdateIssueCommentRequest,
    actorUserId: string,
  ): Promise<IssueDetail> {
    const repo = await this.requireRepo(slug);
    const issue = await this.loadIssue(repo.id, number);
    const comment = await this.prisma.issueComment.findFirst({
      where: { id: commentId, issueId: issue.id },
    });
    if (!comment) {
      throw new NotFoundException("Comment not found");
    }
    if (comment.authorId !== actorUserId) {
      throw new ForbiddenException("Only the comment author can edit it");
    }

    await this.prisma.issueComment.update({
      where: { id: commentId },
      data: { body: input.body },
    });

    await this.auditService.log({
      userId: actorUserId,
      repositoryId: repo.id,
      action: "issue.comment.update",
      resourceType: "issue",
      resourceId: String(number),
      metadata: { commentId },
    });

    const reloaded = await this.loadIssue(repo.id, number);
    return this.toDetail(reloaded);
  }

  async removeComment(
    slug: string,
    number: number,
    commentId: string,
    actorUserId: string,
  ): Promise<IssueDetail> {
    const repo = await this.requireRepo(slug);
    const issue = await this.loadIssue(repo.id, number);
    const comment = await this.prisma.issueComment.findFirst({
      where: { id: commentId, issueId: issue.id },
    });
    if (!comment) {
      throw new NotFoundException("Comment not found");
    }
    if (comment.authorId !== actorUserId) {
      throw new ForbiddenException("Only the comment author can delete it");
    }

    await this.prisma.issueComment.delete({ where: { id: commentId } });

    await this.auditService.log({
      userId: actorUserId,
      repositoryId: repo.id,
      action: "issue.comment.delete",
      resourceType: "issue",
      resourceId: String(number),
      metadata: { commentId },
    });

    const reloaded = await this.loadIssue(repo.id, number);
    return this.toDetail(reloaded);
  }

  async closeByPullRequest(
    repositoryId: string,
    repositorySlug: string,
    issueNumber: number,
    pullRequestNumber: number,
    actorUserId: string | null,
  ): Promise<void> {
    const issue = await this.prisma.issue.findUnique({
      where: {
        repositoryId_number: { repositoryId, number: issueNumber },
      },
    });
    if (!issue || issue.status === "CLOSED") {
      return;
    }

    await this.prisma.issue.update({
      where: { id: issue.id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        closedByPrNumber: pullRequestNumber,
      },
    });

    await this.auditService.log({
      userId: actorUserId ?? undefined,
      repositoryId,
      action: "issue.close",
      resourceType: "issue",
      resourceId: String(issueNumber),
      metadata: { closedByPrNumber: pullRequestNumber },
    });

    await this.webhooksService.enqueueDeliveries("ISSUE_CLOSED", {
      repositoryId,
      repositorySlug,
      data: {
        issueNumber,
        closedByPrNumber: pullRequestNumber,
      },
    });
  }

  async addSystemComment(
    repositoryId: string,
    issueNumber: number,
    authorId: string,
    body: string,
  ): Promise<void> {
    const issue = await this.prisma.issue.findUnique({
      where: {
        repositoryId_number: { repositoryId, number: issueNumber },
      },
    });
    if (!issue) {
      return;
    }

    await this.prisma.issueComment.create({
      data: {
        issueId: issue.id,
        authorId,
        body,
      },
    });
  }

  async findUserIdByUsername(username: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    return user?.id ?? null;
  }

  private async createWithNextNumber(input: {
    repositoryId: string;
    title: string;
    body: string | null;
    authorId: string;
    assigneeId: string | null;
    labelIds: string[];
  }) {
    const maxAttempts = 5;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const maxNumber = await this.prisma.issue.aggregate({
        where: { repositoryId: input.repositoryId },
        _max: { number: true },
      });
      const number = (maxNumber._max.number ?? 0) + 1;

      try {
        const issue = await this.prisma.issue.create({
          data: {
            number,
            repositoryId: input.repositoryId,
            title: input.title,
            body: input.body,
            authorId: input.authorId,
            assigneeId: input.assigneeId,
            labels: input.labelIds.length
              ? {
                  create: input.labelIds.map((labelId) => ({ labelId })),
                }
              : undefined,
          },
          include: this.detailInclude(),
        });
        return issue;
      } catch (error) {
        if (this.isUniqueNumberConflict(error)) {
          continue;
        }
        throw error;
      }
    }

    throw new ConflictException("Unable to allocate issue number");
  }

  private async recordUpdateSideEffects(input: {
    repo: { id: string; slug: string };
    issue: IssueWithRelations;
    actorUserId: string;
    previousStatus: IssueStatus;
    previousAssigneeId: string | null;
    previousLabelIds: string[];
    input: UpdateIssueRequest;
  }) {
    const { repo, issue, actorUserId, previousStatus, previousAssigneeId, previousLabelIds } =
      input;

    if (input.input.status !== undefined && input.input.status !== previousStatus) {
      await this.auditService.log({
        userId: actorUserId,
        repositoryId: repo.id,
        action: input.input.status === "CLOSED" ? "issue.close" : "issue.reopen",
        resourceType: "issue",
        resourceId: String(issue.number),
      });

      await this.webhooksService.enqueueDeliveries(
        input.input.status === "CLOSED" ? "ISSUE_CLOSED" : "ISSUE_OPENED",
        {
          repositoryId: repo.id,
          repositorySlug: repo.slug,
          data: { issueNumber: issue.number },
        },
      );
    }

    if (
      input.input.assigneeId !== undefined &&
      input.input.assigneeId !== previousAssigneeId
    ) {
      await this.auditService.log({
        userId: actorUserId,
        repositoryId: repo.id,
        action: "issue.assign",
        resourceType: "issue",
        resourceId: String(issue.number),
        metadata: { assigneeId: input.input.assigneeId },
      });

      if (input.input.assigneeId) {
        const assigner = await this.prisma.user.findUnique({
          where: { id: actorUserId },
          select: { username: true },
        });
        if (assigner) {
          await this.notificationsService.notifyIssueAssigned({
            repositorySlug: repo.slug,
            issueNumber: issue.number,
            issueTitle: issue.title,
            assigneeId: input.input.assigneeId,
            assignerId: actorUserId,
            assignerUsername: assigner.username,
          });
        }
      }
    }

    if (input.input.labelIds !== undefined) {
      const nextLabelIds = input.input.labelIds;
      const added = nextLabelIds.filter((labelId) => !previousLabelIds.includes(labelId));
      const removed = previousLabelIds.filter((labelId) => !nextLabelIds.includes(labelId));
      if (added.length || removed.length) {
        await this.auditService.log({
          userId: actorUserId,
          repositoryId: repo.id,
          action: "issue.labels",
          resourceType: "issue",
          resourceId: String(issue.number),
          metadata: { added, removed },
        });
      }
    }

    if (input.input.title !== undefined || input.input.body !== undefined) {
      await this.auditService.log({
        userId: actorUserId,
        repositoryId: repo.id,
        action: "issue.update",
        resourceType: "issue",
        resourceId: String(issue.number),
      });
    }
  }

  private async syncIssueLabels(issueId: string, labelIds: string[]) {
    await this.prisma.issueLabel.deleteMany({ where: { issueId } });
    if (labelIds.length === 0) {
      return;
    }
    await this.prisma.issueLabel.createMany({
      data: labelIds.map((labelId) => ({ issueId, labelId })),
    });
  }

  private async validateAssignee(repositoryId: string, assigneeId?: string) {
    if (!assigneeId) {
      return;
    }
    const membership = await this.prisma.repoMember.findFirst({
      where: { repositoryId, userId: assigneeId },
    });
    if (!membership) {
      throw new BadRequestException("Assignee must be a repository member");
    }
  }

  private async validateLabels(repositoryId: string, labelIds: string[]) {
    if (labelIds.length === 0) {
      return;
    }
    const labels = await this.prisma.label.findMany({
      where: { repositoryId, id: { in: labelIds } },
    });
    if (labels.length !== labelIds.length) {
      throw new BadRequestException("One or more labels are invalid for this repository");
    }
  }

  private async resolveEffectiveRole(
    userId: string,
    repositoryId: string,
  ): Promise<RepoRole | null> {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });
    if (dbUser?.isAdmin) {
      return "OWNER";
    }

    const membership = await this.prisma.repoMember.findUnique({
      where: { userId_repositoryId: { userId, repositoryId } },
    });

    const teamMemberships = await this.prisma.groupMember.findMany({
      where: { userId },
      select: { groupId: true },
    });

    let teamRole: RepoRole | null = null;
    if (teamMemberships.length > 0) {
      const repoTeams = await this.prisma.repoTeam.findMany({
        where: {
          repositoryId,
          groupId: { in: teamMemberships.map((entry) => entry.groupId) },
        },
        select: { role: true },
      });
      teamRole = maxRepoRole(...repoTeams.map((entry) => entry.role as RepoRole));
    }

    return maxRepoRole(membership?.role as RepoRole | undefined, teamRole ?? undefined);
  }

  private summaryInclude() {
    return {
      author: true,
      assignee: true,
      labels: { include: { label: true } },
      _count: { select: { comments: true } },
    };
  }

  private detailInclude() {
    return {
      author: true,
      assignee: true,
      labels: { include: { label: true } },
      comments: { include: { author: true }, orderBy: { createdAt: "asc" as const } },
    };
  }

  private async loadIssue(repositoryId: string, number: number) {
    const issue = await this.prisma.issue.findUnique({
      where: { repositoryId_number: { repositoryId, number } },
      include: this.detailInclude(),
    });
    if (!issue) {
      throw new NotFoundException("Issue not found");
    }
    return issue;
  }

  private toSummary(issue: {
    id: string;
    number: number;
    title: string;
    status: IssueStatus;
    closedAt: Date | null;
    closedByPrNumber: number | null;
    createdAt: Date;
    updatedAt: Date;
    author: {
      id: string;
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
    };
    assignee: {
      id: string;
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
    labels: Array<{ label: { id: string; name: string; color: string; description: string | null } }>;
    _count?: { comments: number };
  }) {
    return {
      id: issue.id,
      number: issue.number,
      title: issue.title,
      status: issue.status,
      author: this.toAuthor(issue.author),
      assignee: issue.assignee ? this.toAuthor(issue.assignee) : null,
      labels: issue.labels.map((entry) => this.toLabel(entry.label)),
      commentCount: issue._count?.comments ?? 0,
      closedAt: issue.closedAt?.toISOString() ?? null,
      closedByPrNumber: issue.closedByPrNumber,
      createdAt: issue.createdAt.toISOString(),
      updatedAt: issue.updatedAt.toISOString(),
    };
  }

  private toDetail(issue: IssueWithRelations): IssueDetail {
    const summary = this.toSummary({ ...issue, _count: { comments: issue.comments.length } });
    const timeline = this.buildTimeline(issue);

    return {
      ...summary,
      body: issue.body,
      comments: issue.comments.map((comment) => ({
        id: comment.id,
        body: comment.body,
        author: this.toAuthor(comment.author),
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
      })),
      timeline,
    };
  }

  private buildTimeline(issue: IssueWithRelations): IssueTimelineEntry[] {
    const entries: IssueTimelineEntry[] = [
      {
        id: `${issue.id}-opened`,
        type: "opened",
        actor: this.toAuthor(issue.author),
        createdAt: issue.createdAt.toISOString(),
        body: issue.body ?? undefined,
      },
    ];

    for (const comment of issue.comments) {
      const isCommitReference = comment.body.startsWith("Referenciado no commit");
      entries.push({
        id: comment.id,
        type: isCommitReference ? "commit_reference" : "comment",
        actor: this.toAuthor(comment.author),
        createdAt: comment.createdAt.toISOString(),
        body: comment.body,
      });
    }

    if (issue.status === "CLOSED" && issue.closedAt) {
      entries.push({
        id: `${issue.id}-closed`,
        type: issue.closedByPrNumber ? "closed_by_pr" : "closed",
        actor: null,
        createdAt: issue.closedAt.toISOString(),
        metadata: issue.closedByPrNumber
          ? { pullRequestNumber: issue.closedByPrNumber }
          : undefined,
      });
    }

    return entries.sort(
      (left, right) =>
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
    );
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

  private toLabel(label: {
    id: string;
    name: string;
    color: string;
    description: string | null;
  }) {
    return {
      id: label.id,
      name: label.name,
      color: label.color,
      description: label.description,
    };
  }

  private async requireRepo(slug: string) {
    const repo = await this.prisma.repository.findUnique({ where: { slug } });
    if (!repo) {
      throw new NotFoundException("Repository not found");
    }
    return repo;
  }

  private isUniqueNumberConflict(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
    );
  }
}

@Injectable()
export class LabelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list(slug: string): Promise<LabelListResponse> {
    const repo = await this.requireRepo(slug);
    const labels = await this.prisma.label.findMany({
      where: { repositoryId: repo.id },
      orderBy: { name: "asc" },
    });
    return {
      labels: labels.map((label) => ({
        id: label.id,
        name: label.name,
        color: label.color,
        description: label.description,
      })),
    };
  }

  async create(
    slug: string,
    input: CreateLabelRequest,
    actorUserId: string,
  ) {
    const repo = await this.requireRepo(slug);
    const label = await this.prisma.label.create({
      data: {
        repositoryId: repo.id,
        name: input.name,
        color: input.color,
        description: input.description ?? null,
      },
    });

    await this.auditService.log({
      userId: actorUserId,
      repositoryId: repo.id,
      action: "label.create",
      resourceType: "label",
      resourceId: label.id,
      metadata: { name: label.name },
    });

    return {
      id: label.id,
      name: label.name,
      color: label.color,
      description: label.description,
    };
  }

  async update(
    slug: string,
    labelId: string,
    input: UpdateLabelRequest,
    actorUserId: string,
  ) {
    const repo = await this.requireRepo(slug);
    const existing = await this.prisma.label.findFirst({
      where: { id: labelId, repositoryId: repo.id },
    });
    if (!existing) {
      throw new NotFoundException("Label not found");
    }

    const label = await this.prisma.label.update({
      where: { id: labelId },
      data: {
        name: input.name,
        color: input.color,
        description: input.description,
      },
    });

    await this.auditService.log({
      userId: actorUserId,
      repositoryId: repo.id,
      action: "label.update",
      resourceType: "label",
      resourceId: label.id,
    });

    return {
      id: label.id,
      name: label.name,
      color: label.color,
      description: label.description,
    };
  }

  async remove(slug: string, labelId: string, actorUserId: string): Promise<void> {
    const repo = await this.requireRepo(slug);
    const existing = await this.prisma.label.findFirst({
      where: { id: labelId, repositoryId: repo.id },
    });
    if (!existing) {
      throw new NotFoundException("Label not found");
    }

    await this.prisma.label.delete({ where: { id: labelId } });

    await this.auditService.log({
      userId: actorUserId,
      repositoryId: repo.id,
      action: "label.delete",
      resourceType: "label",
      resourceId: labelId,
      metadata: { name: existing.name },
    });
  }

  private async requireRepo(slug: string) {
    const repo = await this.prisma.repository.findUnique({ where: { slug } });
    if (!repo) {
      throw new NotFoundException("Repository not found");
    }
    return repo;
  }
}
