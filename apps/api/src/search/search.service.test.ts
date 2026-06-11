import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../prisma/prisma.service";
import type { UserStatsService } from "../users/user-stats.service";
import { SearchService } from "./search.service";

const REPO = {
  id: "repo-1",
  name: "Alpha Project",
  slug: "alpha-project",
  description: "Main repo",
  defaultBranch: "main",
  isArchived: false,
};

function createService(options: {
  access?: Awaited<ReturnType<UserStatsService["resolveViewerAccess"]>>;
  repositories?: typeof REPO[];
  users?: Array<{
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  }>;
}) {
  const userStatsService = {
    resolveViewerAccess: vi.fn().mockResolvedValue(
      options.access ?? { type: "repos", ids: ["repo-1"] },
    ),
  } as unknown as UserStatsService;

  const prisma = {
    repository: {
      findMany: vi.fn().mockResolvedValue(options.repositories ?? []),
    },
    user: {
      findMany: vi.fn().mockResolvedValue(options.users ?? []),
    },
  } as unknown as PrismaService;

  return {
    service: new SearchService(prisma, userStatsService),
    prisma,
  };
}

describe("SearchService", () => {
  it("returns empty results for blank queries", async () => {
    const { service, prisma } = createService({});

    const result = await service.search("user-1", "   ");

    expect(result).toEqual({ repositories: [], users: [] });
    expect(prisma.repository.findMany).not.toHaveBeenCalled();
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it("searches repositories and users with case-insensitive terms", async () => {
    const { service, prisma } = createService({
      repositories: [REPO],
      users: [{ username: "alice", displayName: "Alice", avatarUrl: null }],
    });

    const result = await service.search("user-1", "Alpha");

    expect(result.repositories).toEqual([REPO]);
    expect(result.users).toEqual([
      { username: "alice", displayName: "Alice", avatarUrl: null },
    ]);
    expect(prisma.repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { name: { contains: "Alpha", mode: "insensitive" } },
            { slug: { contains: "Alpha", mode: "insensitive" } },
            { description: { contains: "Alpha", mode: "insensitive" } },
          ]),
        }),
      }),
    );
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          OR: [
            { username: { contains: "Alpha", mode: "insensitive" } },
            { displayName: { contains: "Alpha", mode: "insensitive" } },
          ],
        }),
      }),
    );
  });

  it("does not return repositories when viewer has no access", async () => {
    const { service } = createService({
      access: { type: "none" },
      repositories: [],
    });

    const result = await service.search("user-1", "alpha");

    expect(result.repositories).toEqual([]);
  });
});
