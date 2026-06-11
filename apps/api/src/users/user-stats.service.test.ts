import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../prisma/prisma.service";
import { UserStatsService } from "./user-stats.service";

const PROFILE_USER = {
  id: "user-1",
  username: "alice",
  displayName: "Alice",
  bio: "Builder",
  avatarUrl: "/users/alice/avatar?v=1",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  isActive: true,
};

function createService(options: {
  profileUser?: typeof PROFILE_USER | null;
  viewer?: { isAdmin: boolean; isActive: boolean } | null;
  accessibleRepoIds?: string[];
  heatmapRows?: Array<{ day: Date; count: bigint }>;
  revisionCount?: number;
  pullRequestCounts?: [number, number];
}) {
  const prisma = {
    user: {
      findUnique: vi.fn().mockImplementation(({ where }: { where: { username?: string; id?: string } }) => {
        if (where.username === "missing") {
          return Promise.resolve(null);
        }
        if (where.id === "viewer-1") {
          return Promise.resolve(options.viewer ?? { isAdmin: false, isActive: true });
        }
        if (where.username === "alice") {
          return Promise.resolve(options.profileUser ?? PROFILE_USER);
        }
        return Promise.resolve(null);
      }),
    },
    repository: {
      findMany: vi.fn().mockResolvedValue(
        options.accessibleRepoIds?.map((id) => ({
          id,
          name: `Repo ${id}`,
          slug: id,
          description: null,
          defaultBranch: "trunk",
          isArchived: false,
        })) ?? [],
      ),
    },
    revisionIndex: {
      count: vi.fn().mockResolvedValue(options.revisionCount ?? 0),
      findMany: vi.fn().mockResolvedValue([]),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    pullRequest: {
      count: vi
        .fn()
        .mockResolvedValueOnce(options.pullRequestCounts?.[0] ?? 0)
        .mockResolvedValueOnce(options.pullRequestCounts?.[1] ?? 0),
      findMany: vi.fn().mockResolvedValue([]),
    },
    $queryRaw: vi.fn().mockResolvedValue(options.heatmapRows ?? []),
  } as unknown as PrismaService;

  return { service: new UserStatsService(prisma), prisma };
}

describe("UserStatsService", () => {
  it("throws when profile user is missing", async () => {
    const { service } = createService({ profileUser: null });

    await expect(service.getPublicProfile("missing")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("returns empty heatmap for anonymous viewers", async () => {
    const { service } = createService({});

    const result = await service.getHeatmap("alice");

    expect(result).toEqual({ days: [], total: 0 });
  });

  it("aggregates daily heatmap counts with zero-filled days", async () => {
    const day = new Date("2026-06-10T12:00:00.000Z");
    const { service } = createService({
      viewer: { isAdmin: true, isActive: true },
      heatmapRows: [{ day, count: 4n }],
    });

    const result = await service.getHeatmap(
      "alice",
      "viewer-1",
      {
        from: "2026-06-10",
        to: "2026-06-10",
      },
    );

    expect(result.total).toBe(4);
    expect(result.days).toEqual([
      { date: "2026-06-10T00:00:00.000Z", count: 4 },
    ]);
  });

  it("filters heatmap by repositories visible to the viewer", async () => {
    const { service, prisma } = createService({
      viewer: { isAdmin: false, isActive: true },
      accessibleRepoIds: ["repo-1", "repo-2"],
      heatmapRows: [],
    });

    await service.getHeatmap("alice", "viewer-1", {
      from: "2026-06-01",
      to: "2026-06-10",
    });

    expect(prisma.$queryRaw).toHaveBeenCalled();
  });

  it("builds public profile stats for an authenticated viewer", async () => {
    const { service } = createService({
      viewer: { isAdmin: true, isActive: true },
      accessibleRepoIds: ["repo-1"],
      revisionCount: 12,
      pullRequestCounts: [2, 5],
    });

    const profile = await service.getPublicProfile("alice", "viewer-1");

    expect(profile.username).toBe("alice");
    expect(profile.stats).toEqual({
      repositoryCount: 1,
      commitCount: 12,
      openPullRequestCount: 2,
      mergedPullRequestCount: 5,
    });
    expect(profile.repositories).toHaveLength(1);
  });
});
