import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  RepositoryActivityResponse,
  RepositoryAuthorDistributionResponse,
  RepositoryContributorsResponse,
  RepositoryMonthlyActivityResponse,
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

  async getMonthlyActivity(
    slug: string,
    months = 12,
  ): Promise<RepositoryMonthlyActivityResponse> {
    const repository = await this.requireRepository(slug);
    const startDate = this.monthsAgo(months);

    const rows = await this.prisma.$queryRaw<Array<{ month_start: Date; count: bigint }>>`
      SELECT date_trunc('month', date) AS month_start, COUNT(*)::bigint AS count
      FROM "RevisionIndex"
      WHERE "repositoryId" = ${repository.id}
        AND date >= ${startDate}
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    const countByMonth = new Map(
      rows.map((row) => [this.toMonthKey(row.month_start), Number(row.count)]),
    );

    const monthStarts = this.buildMonthRange(startDate, months);
    const activityMonths = monthStarts.map((monthStart) => ({
      monthStart: monthStart.toISOString(),
      count: countByMonth.get(this.toMonthKey(monthStart)) ?? 0,
    }));

    const total = activityMonths.reduce((sum, month) => sum + month.count, 0);
    return { months: activityMonths, total };
  }

  async getAuthorDistribution(slug: string): Promise<RepositoryAuthorDistributionResponse> {
    const contributors = await this.getContributors(slug);
    const total = contributors.contributors.reduce((sum, entry) => sum + entry.commits, 0);

    return {
      total,
      authors: contributors.contributors.map((entry) => ({
        author: entry.author,
        hasProfile: entry.hasProfile,
        commits: entry.commits,
        percentage: total > 0 ? Math.round((entry.commits / total) * 1000) / 10 : 0,
      })),
    };
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

  private monthsAgo(months: number): Date {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() - months + 1);
    return date;
  }

  private buildMonthRange(startDate: Date, months: number): Date[] {
    const result: Date[] = [];
    const cursor = new Date(startDate);
    cursor.setUTCDate(1);
    const end = new Date();
    end.setUTCDate(1);

    while (cursor <= end && result.length < months + 1) {
      result.push(new Date(cursor));
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }

    return result;
  }

  private toMonthKey(date: Date): string {
    const normalized = new Date(date);
    normalized.setUTCDate(1);
    normalized.setUTCHours(0, 0, 0, 0);
    return normalized.toISOString();
  }
}
