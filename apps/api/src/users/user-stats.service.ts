import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  PublicUserProfile,
  UserActivityResponse,
  UserHeatmapResponse,
  UserProfileStats,
} from "@svnhub/shared";

import { PrismaService } from "../prisma/prisma.service";

type ViewerAccess =
  | { type: "all" }
  | { type: "repos"; ids: string[] }
  | { type: "none" };

export interface HeatmapQuery {
  from?: string;
  to?: string;
}

@Injectable()
export class UserStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicProfile(username: string, viewerId?: string): Promise<PublicUserProfile> {
    const profileUser = await this.requireActiveUser(username);
    const access = await this.resolveViewerAccess(viewerId);
    const repoFilter = this.buildRepositoryFilter(access);

    const [repositories, commitCount, openPullRequestCount, mergedPullRequestCount] =
      await Promise.all([
        this.prisma.repository.findMany({
          where: {
            members: { some: { userId: profileUser.id } },
            ...repoFilter,
          },
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            defaultBranch: true,
            isArchived: true,
          },
        }),
        this.countCommits(profileUser.username, access),
        this.countPullRequests(profileUser.id, "OPEN", access),
        this.countPullRequests(profileUser.id, "MERGED", access),
      ]);

    const stats: UserProfileStats = {
      repositoryCount: repositories.length,
      commitCount,
      openPullRequestCount,
      mergedPullRequestCount,
    };

    return {
      username: profileUser.username,
      displayName: profileUser.displayName,
      bio: profileUser.bio,
      avatarUrl: profileUser.avatarUrl,
      createdAt: profileUser.createdAt.toISOString(),
      stats,
      repositories,
    };
  }

  async getHeatmap(
    username: string,
    viewerId?: string,
    query: HeatmapQuery = {},
  ): Promise<UserHeatmapResponse> {
    await this.requireActiveUser(username);
    const access = await this.resolveViewerAccess(viewerId);

    if (access.type === "none") {
      return { days: [], total: 0 };
    }

    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from
      ? new Date(query.from)
      : new Date(to.getTime() - 364 * 24 * 60 * 60 * 1000);

    from.setUTCHours(0, 0, 0, 0);
    to.setUTCHours(23, 59, 59, 999);

    const rows =
      access.type === "all"
        ? await this.prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
            SELECT date_trunc('day', date) AS day, COUNT(*)::bigint AS count
            FROM "RevisionIndex"
            WHERE author = ${username}
              AND date >= ${from}
              AND date <= ${to}
            GROUP BY 1
            ORDER BY 1 ASC
          `
        : await this.prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
            SELECT date_trunc('day', date) AS day, COUNT(*)::bigint AS count
            FROM "RevisionIndex"
            WHERE author = ${username}
              AND date >= ${from}
              AND date <= ${to}
              AND "repositoryId" IN (${Prisma.join(access.ids)})
            GROUP BY 1
            ORDER BY 1 ASC
          `;

    const countByDay = new Map(
      rows.map((row) => [this.toDayKey(row.day), Number(row.count)]),
    );

    const days = this.buildDayRange(from, to).map((day) => ({
      date: day.toISOString(),
      count: countByDay.get(this.toDayKey(day)) ?? 0,
    }));

    const total = days.reduce((sum, day) => sum + day.count, 0);
    return { days, total };
  }

  async getActivity(username: string, viewerId?: string): Promise<UserActivityResponse> {
    const profileUser = await this.requireActiveUser(username);
    const access = await this.resolveViewerAccess(viewerId);

    if (access.type === "none") {
      return { items: [], activeRepositories: [] };
    }

    const repoFilter = this.buildRepositoryFilter(access);

    const [revisions, pullRequests, activeRepoGroups] = await Promise.all([
      this.prisma.revisionIndex.findMany({
        where: {
          author: username,
          ...repoFilter,
        },
        orderBy: { date: "desc" },
        take: 20,
        include: {
          repository: { select: { slug: true, name: true } },
        },
      }),
      this.prisma.pullRequest.findMany({
        where: {
          authorId: profileUser.id,
          status: { in: ["OPEN", "MERGED"] },
          ...repoFilter,
        },
        orderBy: { updatedAt: "desc" },
        take: 20,
        include: {
          repository: { select: { slug: true, name: true } },
        },
      }),
      this.prisma.revisionIndex.groupBy({
        by: ["repositoryId"],
        where: {
          author: username,
          date: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
          ...repoFilter,
        },
        _count: { revision: true },
        orderBy: { _count: { revision: "desc" } },
        take: 5,
      }),
    ]);

    const repoNameById = new Map<string, { slug: string; name: string }>();
    for (const revision of revisions) {
      repoNameById.set(revision.repositoryId, revision.repository);
    }
    for (const pullRequest of pullRequests) {
      repoNameById.set(pullRequest.repositoryId, pullRequest.repository);
    }

    const activeRepoIds = activeRepoGroups.map((group) => group.repositoryId);
    if (activeRepoIds.length > 0) {
      const repos = await this.prisma.repository.findMany({
        where: { id: { in: activeRepoIds } },
        select: { id: true, slug: true, name: true },
      });
      for (const repo of repos) {
        repoNameById.set(repo.id, repo);
      }
    }

    const items = [
      ...revisions.map((revision) => ({
        kind: "revision" as const,
        repositorySlug: revision.repository.slug,
        repositoryName: revision.repository.name,
        revision: revision.revision,
        message: revision.message,
        date: revision.date.toISOString(),
      })),
      ...pullRequests.flatMap((pullRequest) => {
        const entries = [];
        entries.push({
          kind: "pull_request_opened" as const,
          repositorySlug: pullRequest.repository.slug,
          repositoryName: pullRequest.repository.name,
          number: pullRequest.number,
          title: pullRequest.title,
          status: pullRequest.status,
          date: pullRequest.createdAt.toISOString(),
        });
        if (pullRequest.status === "MERGED" && pullRequest.mergedAt) {
          entries.push({
            kind: "pull_request_merged" as const,
            repositorySlug: pullRequest.repository.slug,
            repositoryName: pullRequest.repository.name,
            number: pullRequest.number,
            title: pullRequest.title,
            status: pullRequest.status,
            date: pullRequest.mergedAt.toISOString(),
          });
        }
        return entries;
      }),
    ]
      .sort((left, right) => right.date.localeCompare(left.date))
      .slice(0, 30);

    const activeRepositories = activeRepoGroups
      .map((group) => {
        const repo = repoNameById.get(group.repositoryId);
        if (!repo) {
          return null;
        }
        return {
          slug: repo.slug,
          name: repo.name,
          commitCount: group._count.revision,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    return { items, activeRepositories };
  }

  async resolveViewerAccess(viewerId?: string): Promise<ViewerAccess> {
    if (!viewerId) {
      return { type: "none" };
    }

    const viewer = await this.prisma.user.findUnique({
      where: { id: viewerId },
      select: { isAdmin: true, isActive: true },
    });

    if (!viewer?.isActive) {
      return { type: "none" };
    }

    if (viewer.isAdmin) {
      return { type: "all" };
    }

    const repos = await this.prisma.repository.findMany({
      where: {
        OR: [
          { members: { some: { userId: viewerId } } },
          {
            repoTeams: {
              some: {
                group: { members: { some: { userId: viewerId } } },
              },
            },
          },
        ],
      },
      select: { id: true },
    });

    return { type: "repos", ids: repos.map((repo) => repo.id) };
  }

  private async requireActiveUser(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        createdAt: true,
        isActive: true,
      },
    });

    if (!user?.isActive) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  private buildRepositoryFilter(access: ViewerAccess): { id?: { in: string[] } } {
    if (access.type === "all") {
      return {};
    }
    if (access.type === "none") {
      return { id: { in: [] } };
    }
    return { id: { in: access.ids } };
  }

  private async countCommits(username: string, access: ViewerAccess): Promise<number> {
    if (access.type === "none") {
      return 0;
    }

    return this.prisma.revisionIndex.count({
      where: {
        author: username,
        ...this.buildRepositoryFilter(access),
      },
    });
  }

  private async countPullRequests(
    authorId: string,
    status: "OPEN" | "MERGED",
    access: ViewerAccess,
  ): Promise<number> {
    if (access.type === "none") {
      return 0;
    }

    return this.prisma.pullRequest.count({
      where: {
        authorId,
        status,
        ...this.buildRepositoryFilter(access),
      },
    });
  }

  private buildDayRange(from: Date, to: Date): Date[] {
    const days: Date[] = [];
    const cursor = new Date(from);
    cursor.setUTCHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setUTCHours(0, 0, 0, 0);

    while (cursor <= end) {
      days.push(new Date(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return days;
  }

  private toDayKey(date: Date): string {
    const normalized = new Date(date);
    normalized.setUTCHours(0, 0, 0, 0);
    return normalized.toISOString();
  }
}
