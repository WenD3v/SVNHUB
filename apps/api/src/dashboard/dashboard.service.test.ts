import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../prisma/prisma.service";
import type { UserStatsService } from "../users/user-stats.service";
import { DashboardService } from "./dashboard.service";

const REPO = {
  id: "repo-1",
  name: "Alpha",
  slug: "alpha",
  description: "First repo",
  defaultBranch: "main",
  isArchived: false,
};

function createService(options: {
  access?: Awaited<ReturnType<UserStatsService["resolveViewerAccess"]>>;
  recentRepos?: typeof REPO[];
  authoredPullRequests?: Array<{
    id: string;
    number: number;
    title: string;
    status: "OPEN";
    sourceRef: string;
    targetRef: string;
    createdAt: Date;
    updatedAt: Date;
    author: { username: string; displayName: string | null };
    repository: { slug: string; name: string };
  }>;
  reviewPullRequests?: typeof options.authoredPullRequests;
  pipelines?: Array<{
    id: string;
    revision: number;
    branchPath: string;
    trigger: "PUSH";
    status: "SUCCESS";
    startedAt: Date | null;
    finishedAt: Date | null;
    createdAt: Date;
    repository: { slug: string; name: string };
  }>;
  revisions?: Array<{
    revision: number;
    author: string;
    message: string;
    date: Date;
    repository: { slug: string; name: string };
  }>;
}) {
  const userStatsService = {
    resolveViewerAccess: vi.fn().mockResolvedValue(
      options.access ?? { type: "repos", ids: ["repo-1"] },
    ),
  } as unknown as UserStatsService;

  const prisma = {
    repository: {
      findMany: vi.fn().mockResolvedValue(options.recentRepos ?? [REPO]),
    },
    pullRequest: {
      findMany: vi.fn().mockImplementation(({ where }: { where: Record<string, unknown> }) => {
        if (where.authorId && where.status === "OPEN") {
          return Promise.resolve(options.authoredPullRequests ?? []);
        }
        if (where.reviews) {
          return Promise.resolve(options.reviewPullRequests ?? []);
        }
        return Promise.resolve([]);
      }),
      count: vi.fn().mockResolvedValue(0),
    },
    pipeline: {
      findMany: vi
        .fn()
        .mockResolvedValueOnce(options.pipelines ?? [])
        .mockResolvedValueOnce(options.pipelines ?? []),
      count: vi.fn().mockResolvedValue(0),
    },
    revisionIndex: {
      findMany: vi.fn().mockResolvedValue(
        (options.revisions ?? []).map((revision) => ({
          repositoryId: "repo-1",
          ...revision,
        })),
      ),
      count: vi.fn().mockResolvedValue(options.revisions?.length ?? 0),
    },
  } as unknown as PrismaService;

  return {
    service: new DashboardService(prisma, userStatsService),
    prisma,
    userStatsService,
  };
}

describe("DashboardService", () => {
  it("returns empty dashboard when viewer has no repository access", async () => {
    const { service } = createService({ access: { type: "none" } });

    const result = await service.getDashboard("user-1");

    expect(result.recentRepositories).toEqual([]);
    expect(result.authoredOpenPullRequests).toEqual([]);
    expect(result.reviewRequestedPullRequests).toEqual([]);
    expect(result.recentPipelines).toEqual([]);
    expect(result.activityFeed).toEqual({ items: [], total: 0, hasMore: false });
  });

  it("returns recent repositories for accessible viewers", async () => {
    const { service } = createService({});

    const result = await service.getDashboard("user-1");

    expect(result.recentRepositories).toEqual([REPO]);
  });

  it("maps authored open pull requests with repository metadata", async () => {
    const createdAt = new Date("2026-06-01T10:00:00.000Z");
    const updatedAt = new Date("2026-06-02T10:00:00.000Z");
    const authoredPullRequests = [
      {
        id: "pr-1",
        number: 7,
        title: "Add dashboard",
        status: "OPEN" as const,
        sourceRef: "feature/dashboard",
        targetRef: "main",
        createdAt,
        updatedAt,
        author: { username: "alice", displayName: "Alice" },
        repository: { slug: "alpha", name: "Alpha" },
      },
    ];

    const { service } = createService({ authoredPullRequests });

    const result = await service.getDashboard("user-1");

    expect(result.authoredOpenPullRequests).toEqual([
      {
        id: "pr-1",
        number: 7,
        title: "Add dashboard",
        status: "OPEN",
        sourceRef: "feature/dashboard",
        targetRef: "main",
        repositorySlug: "alpha",
        repositoryName: "Alpha",
        authorUsername: "alice",
        authorDisplayName: "Alice",
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
      },
    ]);
  });

  it("includes revision activity in the feed sorted by date", async () => {
    const older = new Date("2026-06-01T10:00:00.000Z");
    const newer = new Date("2026-06-02T10:00:00.000Z");
    const { service } = createService({
      revisions: [
        {
          revision: 10,
          author: "alice",
          message: "Older commit",
          date: older,
          repository: { slug: "alpha", name: "Alpha" },
        },
        {
          revision: 11,
          author: "alice",
          message: "Newer commit",
          date: newer,
          repository: { slug: "alpha", name: "Alpha" },
        },
      ],
    });

    const result = await service.getDashboard("user-1");

    expect(result.activityFeed.items).toHaveLength(2);
    expect(result.activityFeed.items[0]?.kind).toBe("revision");
    expect(result.activityFeed.items[0]?.date).toBe(newer.toISOString());
    expect(result.activityFeed.total).toBe(2);
  });
});
