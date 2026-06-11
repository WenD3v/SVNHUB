import { Injectable } from "@nestjs/common";
import type {
  DashboardActivityFeed,
  DashboardActivityItem,
  DashboardPipelineSummary,
  DashboardPullRequestSummary,
  DashboardResponse,
  RepositorySummary,
} from "@svnhub/shared";

import { PrismaService } from "../prisma/prisma.service";
import { UserStatsService } from "../users/user-stats.service";

const RECENT_REPOS_LIMIT = 10;
const PULL_REQUESTS_LIMIT = 10;
const PIPELINES_LIMIT = 10;
const ACTIVITY_FETCH_BATCH = 100;

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userStatsService: UserStatsService,
  ) {}

  async getDashboard(
    userId: string,
    query: { limit?: number; offset?: number } = {},
  ): Promise<DashboardResponse> {
    const access = await this.userStatsService.resolveViewerAccess(userId);
    const repoFilter = this.buildRepositoryFilter(access);
    const activityFilter = this.buildActivityRepositoryFilter(access);
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    if (access.type === "none") {
      return this.emptyDashboard();
    }

    const [
      recentRepositories,
      authoredOpenPullRequests,
      reviewRequestedPullRequests,
      recentPipelines,
      activityFeed,
    ] = await Promise.all([
      this.getRecentRepositories(repoFilter),
      this.getAuthoredOpenPullRequests(userId, activityFilter),
      this.getReviewRequestedPullRequests(userId, activityFilter),
      this.getRecentPipelines(activityFilter),
      this.getActivityFeed(activityFilter, limit, offset),
    ]);

    return {
      recentRepositories,
      authoredOpenPullRequests,
      reviewRequestedPullRequests,
      recentPipelines,
      activityFeed,
    };
  }

  private emptyDashboard(): DashboardResponse {
    return {
      recentRepositories: [],
      authoredOpenPullRequests: [],
      reviewRequestedPullRequests: [],
      recentPipelines: [],
      activityFeed: { items: [], total: 0, hasMore: false },
    };
  }

  private buildRepositoryFilter(access: Awaited<
    ReturnType<UserStatsService["resolveViewerAccess"]>
  >): { id?: { in: string[] } } {
    if (access.type === "all") {
      return {};
    }
    if (access.type === "none") {
      return { id: { in: [] } };
    }
    return { id: { in: access.ids } };
  }

  private buildActivityRepositoryFilter(access: Awaited<
    ReturnType<UserStatsService["resolveViewerAccess"]>
  >): { repositoryId?: { in: string[] } } {
    if (access.type === "all") {
      return {};
    }
    if (access.type === "none") {
      return { repositoryId: { in: [] } };
    }
    return { repositoryId: { in: access.ids } };
  }

  private async getRecentRepositories(
    repoFilter: { id?: { in: string[] } },
  ): Promise<RepositorySummary[]> {
    const repos = await this.prisma.repository.findMany({
      where: repoFilter,
      orderBy: { updatedAt: "desc" },
      take: RECENT_REPOS_LIMIT,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        defaultBranch: true,
        isArchived: true,
      },
    });

    return repos;
  }

  private async getAuthoredOpenPullRequests(
    userId: string,
    repoFilter: { repositoryId?: { in: string[] } },
  ): Promise<DashboardPullRequestSummary[]> {
    const pullRequests = await this.prisma.pullRequest.findMany({
      where: {
        authorId: userId,
        status: "OPEN",
        ...repoFilter,
      },
      include: {
        author: { select: { username: true, displayName: true } },
        repository: { select: { slug: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: PULL_REQUESTS_LIMIT,
    });

    return pullRequests.map((pullRequest) => this.toPullRequestSummary(pullRequest));
  }

  private async getReviewRequestedPullRequests(
    userId: string,
    repoFilter: { repositoryId?: { in: string[] } },
  ): Promise<DashboardPullRequestSummary[]> {
    const pullRequests = await this.prisma.pullRequest.findMany({
      where: {
        status: "OPEN",
        authorId: { not: userId },
        ...repoFilter,
        reviews: { none: { authorId: userId } },
      },
      include: {
        author: { select: { username: true, displayName: true } },
        repository: { select: { slug: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: PULL_REQUESTS_LIMIT,
    });

    return pullRequests.map((pullRequest) => this.toPullRequestSummary(pullRequest));
  }

  private async getRecentPipelines(
    repoFilter: { repositoryId?: { in: string[] } },
  ): Promise<DashboardPipelineSummary[]> {
    const pipelines = await this.prisma.pipeline.findMany({
      where: repoFilter,
      include: {
        repository: { select: { slug: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: PIPELINES_LIMIT,
    });

    return pipelines.map((pipeline) => ({
      id: pipeline.id,
      revision: pipeline.revision,
      branchPath: pipeline.branchPath,
      trigger: pipeline.trigger,
      status: pipeline.status,
      repositorySlug: pipeline.repository.slug,
      repositoryName: pipeline.repository.name,
      startedAt: pipeline.startedAt?.toISOString() ?? null,
      finishedAt: pipeline.finishedAt?.toISOString() ?? null,
      createdAt: pipeline.createdAt.toISOString(),
    }));
  }

  private async getActivityFeed(
    repoFilter: { repositoryId?: { in: string[] } },
    limit: number,
    offset: number,
  ): Promise<DashboardActivityFeed> {
    const [revisions, pullRequests, pipelines, revisionCount, pullRequestCount, pipelineCount] =
      await Promise.all([
        this.prisma.revisionIndex.findMany({
          where: repoFilter,
          orderBy: { date: "desc" },
          take: ACTIVITY_FETCH_BATCH,
          include: {
            repository: { select: { slug: true, name: true } },
          },
        }),
        this.prisma.pullRequest.findMany({
          where: repoFilter,
          orderBy: { updatedAt: "desc" },
          take: ACTIVITY_FETCH_BATCH,
          include: {
            author: { select: { username: true } },
            repository: { select: { slug: true, name: true } },
          },
        }),
        this.prisma.pipeline.findMany({
          where: repoFilter,
          orderBy: { createdAt: "desc" },
          take: ACTIVITY_FETCH_BATCH,
          include: {
            repository: { select: { slug: true, name: true } },
          },
        }),
        this.prisma.revisionIndex.count({ where: repoFilter }),
        this.prisma.pullRequest.count({ where: repoFilter }),
        this.prisma.pipeline.count({ where: repoFilter }),
      ]);

    const items: DashboardActivityItem[] = [
      ...revisions.map((revision) => ({
        kind: "revision" as const,
        repositorySlug: revision.repository.slug,
        repositoryName: revision.repository.name,
        revision: revision.revision,
        author: revision.author,
        message: revision.message,
        date: revision.date.toISOString(),
      })),
      ...pullRequests.flatMap((pullRequest) => {
        const entries: DashboardActivityItem[] = [
          {
            kind: "pull_request_opened",
            repositorySlug: pullRequest.repository.slug,
            repositoryName: pullRequest.repository.name,
            number: pullRequest.number,
            title: pullRequest.title,
            authorUsername: pullRequest.author.username,
            date: pullRequest.createdAt.toISOString(),
          },
        ];

        if (pullRequest.status === "MERGED" && pullRequest.mergedAt) {
          entries.push({
            kind: "pull_request_merged",
            repositorySlug: pullRequest.repository.slug,
            repositoryName: pullRequest.repository.name,
            number: pullRequest.number,
            title: pullRequest.title,
            authorUsername: pullRequest.author.username,
            date: pullRequest.mergedAt.toISOString(),
          });
        }

        if (pullRequest.status === "CLOSED" && pullRequest.closedAt) {
          entries.push({
            kind: "pull_request_closed",
            repositorySlug: pullRequest.repository.slug,
            repositoryName: pullRequest.repository.name,
            number: pullRequest.number,
            title: pullRequest.title,
            authorUsername: pullRequest.author.username,
            date: pullRequest.closedAt.toISOString(),
          });
        }

        return entries;
      }),
      ...pipelines.map((pipeline) => ({
        kind: "pipeline" as const,
        repositorySlug: pipeline.repository.slug,
        repositoryName: pipeline.repository.name,
        pipelineId: pipeline.id,
        revision: pipeline.revision,
        status: pipeline.status,
        trigger: pipeline.trigger,
        date: pipeline.createdAt.toISOString(),
      })),
    ];

    const total = revisionCount + pullRequestCount + pipelineCount;
    const merged = items.sort((left, right) => right.date.localeCompare(left.date));
    const page = merged.slice(offset, offset + limit);
    const hitFetchLimit =
      revisions.length >= ACTIVITY_FETCH_BATCH ||
      pullRequests.length >= ACTIVITY_FETCH_BATCH ||
      pipelines.length >= ACTIVITY_FETCH_BATCH;

    return {
      items: page,
      total,
      hasMore: offset + limit < merged.length || hitFetchLimit,
    };
  }

  private toPullRequestSummary(pullRequest: {
    id: string;
    number: number;
    title: string;
    status: "OPEN" | "MERGED" | "CLOSED";
    sourceRef: string;
    targetRef: string;
    createdAt: Date;
    updatedAt: Date;
    author: { username: string; displayName: string | null };
    repository: { slug: string; name: string };
  }): DashboardPullRequestSummary {
    return {
      id: pullRequest.id,
      number: pullRequest.number,
      title: pullRequest.title,
      status: pullRequest.status,
      sourceRef: pullRequest.sourceRef,
      targetRef: pullRequest.targetRef,
      repositorySlug: pullRequest.repository.slug,
      repositoryName: pullRequest.repository.name,
      authorUsername: pullRequest.author.username,
      authorDisplayName: pullRequest.author.displayName,
      createdAt: pullRequest.createdAt.toISOString(),
      updatedAt: pullRequest.updatedAt.toISOString(),
    };
  }
}
