import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  RepositoryActivityResponse,
  RepositoryContributorsResponse,
} from "@svnhub/shared";

import { PrismaService } from "../prisma/prisma.service";

export interface ContributorsQuery {
  since?: string;
  until?: string;
}

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getWeeklyActivity(slug: string, weeks = 52): Promise<RepositoryActivityResponse> {
    const repository = await this.requireRepository(slug);
    const startDate = this.weeksAgo(weeks);

    const rows = await this.prisma.$queryRaw<Array<{ week_start: Date; count: bigint }>>`
      SELECT date_trunc('week', date) AS week_start, COUNT(*)::bigint AS count
      FROM "RevisionIndex"
      WHERE "repositoryId" = ${repository.id}
        AND date >= ${startDate}
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    const countByWeek = new Map(
      rows.map((row) => [this.toWeekKey(row.week_start), Number(row.count)]),
    );

    const weekStarts = this.buildWeekRange(startDate, weeks);
    const activityWeeks = weekStarts.map((weekStart) => ({
      weekStart: weekStart.toISOString(),
      count: countByWeek.get(this.toWeekKey(weekStart)) ?? 0,
    }));

    const total = activityWeeks.reduce((sum, week) => sum + week.count, 0);

    return { weeks: activityWeeks, total };
  }

  async getContributors(
    slug: string,
    query: ContributorsQuery = {},
  ): Promise<RepositoryContributorsResponse> {
    const repository = await this.requireRepository(slug);

    const where = {
      repositoryId: repository.id,
      ...(query.since || query.until
        ? {
            date: {
              ...(query.since ? { gte: new Date(query.since) } : {}),
              ...(query.until ? { lte: new Date(query.until) } : {}),
            },
          }
        : {}),
    };

    const groups = await this.prisma.revisionIndex.groupBy({
      by: ["author"],
      where,
      _count: { revision: true },
      _min: { revision: true },
      _max: { revision: true, date: true },
      orderBy: { _count: { revision: "desc" } },
    });

    const authors = groups.map((group) => group.author);
    const profileUsers =
      authors.length > 0
        ? await this.prisma.user.findMany({
            where: { username: { in: authors }, isActive: true },
            select: { username: true },
          })
        : [];
    const profileUsernames = new Set(profileUsers.map((user) => user.username));

    return {
      contributors: groups.map((group) => ({
        author: group.author,
        hasProfile: profileUsernames.has(group.author),
        commits: group._count.revision,
        firstRevision: group._min.revision ?? 0,
        lastRevision: group._max.revision ?? 0,
        lastDate: group._max.date?.toISOString() ?? new Date(0).toISOString(),
      })),
    };
  }

  private async requireRepository(slug: string) {
    const repository = await this.prisma.repository.findUnique({ where: { slug } });
    if (!repository) {
      throw new NotFoundException("Repository not found");
    }
    return repository;
  }

  private weeksAgo(weeks: number): Date {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - weeks * 7);
    return this.startOfWeek(date);
  }

  private buildWeekRange(startDate: Date, weeks: number): Date[] {
    const result: Date[] = [];
    const cursor = this.startOfWeek(startDate);
    const end = this.startOfWeek(new Date());

    while (cursor <= end && result.length < weeks + 1) {
      result.push(new Date(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 7);
    }

    return result;
  }

  private startOfWeek(date: Date): Date {
    const result = new Date(date);
    result.setUTCHours(0, 0, 0, 0);
    const day = result.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    result.setUTCDate(result.getUTCDate() + diff);
    return result;
  }

  private toWeekKey(date: Date): string {
    return this.startOfWeek(date).toISOString();
  }
}
