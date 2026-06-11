import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../prisma/prisma.service";
import { StatsService } from "./stats.service";

const REPO = { id: "repo-1", slug: "demo" };

function createService(options: {
  repository?: typeof REPO | null;
  activityRows?: Array<{ week_start: Date; count: bigint }>;
  contributorGroups?: Array<{
    author: string;
    _count: { revision: number };
    _min: { revision: number | null };
    _max: { revision: number | null; date: Date | null };
  }>;
}) {
  const prisma = {
    repository: {
      findUnique: vi.fn().mockResolvedValue(
        options.repository === null ? null : (options.repository ?? REPO),
      ),
    },
    $queryRaw: vi.fn().mockResolvedValue(options.activityRows ?? []),
    revisionIndex: {
      groupBy: vi.fn().mockResolvedValue(options.contributorGroups ?? []),
    },
    user: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  } as unknown as PrismaService;

  return { service: new StatsService(prisma), prisma };
}

describe("StatsService", () => {
  it("throws when repository is missing", async () => {
    const { service } = createService({ repository: null });
    await expect(service.getWeeklyActivity("missing")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("aggregates weekly activity with zero-filled weeks", async () => {
    const currentWeek = new Date();
    currentWeek.setUTCHours(0, 0, 0, 0);
    const day = currentWeek.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    currentWeek.setUTCDate(currentWeek.getUTCDate() + diff);

    const { service } = createService({
      activityRows: [{ week_start: currentWeek, count: 3n }],
    });

    const result = await service.getWeeklyActivity("demo", 4);

    expect(result.total).toBe(3);
    expect(result.weeks.some((week) => week.count === 3)).toBe(true);
    expect(result.weeks.every((week) => week.weekStart && typeof week.count === "number")).toBe(
      true,
    );
  });

  it("returns contributors ordered by commit count", async () => {
    const { service } = createService({
      contributorGroups: [
        {
          author: "alice",
          _count: { revision: 12 },
          _min: { revision: 1 },
          _max: { revision: 40, date: new Date("2026-06-01T10:00:00.000Z") },
        },
        {
          author: "bob",
          _count: { revision: 5 },
          _min: { revision: 3 },
          _max: { revision: 20, date: new Date("2026-05-15T10:00:00.000Z") },
        },
      ],
    });

    const result = await service.getContributors("demo");

    expect(result.contributors).toEqual([
      {
        author: "alice",
        hasProfile: false,
        commits: 12,
        firstRevision: 1,
        lastRevision: 40,
        lastDate: "2026-06-01T10:00:00.000Z",
      },
      {
        author: "bob",
        hasProfile: false,
        commits: 5,
        firstRevision: 3,
        lastRevision: 20,
        lastDate: "2026-05-15T10:00:00.000Z",
      },
    ]);
  });

  it("applies since/until filters for contributors", async () => {
    const { service, prisma } = createService({ contributorGroups: [] });

    await service.getContributors("demo", {
      since: "2026-01-01T00:00:00.000Z",
      until: "2026-06-01T00:00:00.000Z",
    });

    expect(prisma.revisionIndex.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          repositoryId: REPO.id,
          date: {
            gte: new Date("2026-01-01T00:00:00.000Z"),
            lte: new Date("2026-06-01T00:00:00.000Z"),
          },
        }),
      }),
    );
  });
});
