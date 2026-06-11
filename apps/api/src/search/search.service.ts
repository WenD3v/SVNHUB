import { Injectable } from "@nestjs/common";
import type { RepositorySummary, SearchResponse } from "@svnhub/shared";

import { PrismaService } from "../prisma/prisma.service";
import { UserStatsService } from "../users/user-stats.service";

const SEARCH_LIMIT = 10;

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userStatsService: UserStatsService,
  ) {}

  async search(userId: string, query: string): Promise<SearchResponse> {
    const term = query.trim();
    if (!term) {
      return { repositories: [], users: [] };
    }

    const access = await this.userStatsService.resolveViewerAccess(userId);
    const repoFilter = this.buildRepositoryFilter(access);

    const [repositories, users] = await Promise.all([
      this.searchRepositories(term, repoFilter),
      this.searchUsers(term),
    ]);

    return { repositories, users };
  }

  private buildRepositoryFilter(
    access: Awaited<ReturnType<UserStatsService["resolveViewerAccess"]>>,
  ): { id?: { in: string[] } } | Record<string, never> {
    if (access.type === "all") {
      return {};
    }
    if (access.type === "none") {
      return { id: { in: [] } };
    }
    return { id: { in: access.ids } };
  }

  private async searchRepositories(
    term: string,
    repoFilter: { id?: { in: string[] } } | Record<string, never>,
  ): Promise<RepositorySummary[]> {
    const repos = await this.prisma.repository.findMany({
      where: {
        ...repoFilter,
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { slug: { contains: term, mode: "insensitive" } },
          { description: { contains: term, mode: "insensitive" } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: SEARCH_LIMIT,
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

  private async searchUsers(term: string): Promise<SearchResponse["users"]> {
    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { username: { contains: term, mode: "insensitive" } },
          { displayName: { contains: term, mode: "insensitive" } },
        ],
      },
      orderBy: { username: "asc" },
      take: SEARCH_LIMIT,
      select: {
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    return users;
  }
}
