import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";

import { RepoRoleGuard } from "./repo-role.guard";
import type { PrismaService } from "../../prisma/prisma.service";

describe("RepoRoleGuard", () => {
  function createGuard(options: {
    requiredRole?: string;
    user?: { id: string };
    slug?: string;
    isAdmin?: boolean;
    membershipRole?: string;
    teamGroupIds?: Array<{ groupId: string }>;
    teamRepoRoles?: Array<{ role: string }>;
    repositoryExists?: boolean;
  }) {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(options.requiredRole),
    } as unknown as Reflector;

    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(
          options.isAdmin === undefined ? null : { isAdmin: options.isAdmin },
        ),
      },
      repository: {
        findUnique: vi.fn().mockResolvedValue(
          options.repositoryExists === false
            ? null
            : options.repositoryExists === undefined
              ? null
              : { id: "repo-1" },
        ),
      },
      repoMember: {
        findUnique: vi.fn().mockResolvedValue(
          options.membershipRole ? { role: options.membershipRole } : null,
        ),
      },
      groupMember: {
        findMany: vi.fn().mockResolvedValue(options.teamGroupIds ?? []),
      },
      repoTeam: {
        findMany: vi.fn().mockResolvedValue(options.teamRepoRoles ?? []),
      },
    } as unknown as PrismaService;

    const guard = new RepoRoleGuard(reflector, prisma);
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user: options.user,
          params: { slug: options.slug },
        }),
      }),
    };

    return { guard, context };
  }

  it("allows access when no role is required", async () => {
    const { guard, context } = createGuard({});
    await expect(guard.canActivate(context as never)).resolves.toBe(true);
  });

  it("rejects unauthenticated users", async () => {
    const { guard, context } = createGuard({ requiredRole: "READER", slug: "demo" });
    await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows instance admins regardless of membership", async () => {
    const { guard, context } = createGuard({
      requiredRole: "OWNER",
      slug: "demo",
      user: { id: "admin-1" },
      isAdmin: true,
      repositoryExists: true,
    });
    await expect(guard.canActivate(context as never)).resolves.toBe(true);
  });

  it("rejects users without sufficient repository role", async () => {
    const { guard, context } = createGuard({
      requiredRole: "MAINTAINER",
      slug: "demo",
      user: { id: "user-1" },
      isAdmin: false,
      repositoryExists: true,
      membershipRole: "READER",
    });
    await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows users with sufficient repository role", async () => {
    const { guard, context } = createGuard({
      requiredRole: "MAINTAINER",
      slug: "demo",
      user: { id: "user-1" },
      isAdmin: false,
      repositoryExists: true,
      membershipRole: "MAINTAINER",
    });
    await expect(guard.canActivate(context as never)).resolves.toBe(true);
  });

  it("allows users via team membership when direct role is insufficient", async () => {
    const { guard, context } = createGuard({
      requiredRole: "DEVELOPER",
      slug: "demo",
      user: { id: "user-1" },
      isAdmin: false,
      repositoryExists: true,
      membershipRole: undefined,
      teamGroupIds: [{ groupId: "team-1" }],
      teamRepoRoles: [{ role: "DEVELOPER" }],
    });
    await expect(guard.canActivate(context as never)).resolves.toBe(true);
  });

  it("uses the highest role between direct membership and teams", async () => {
    const { guard, context } = createGuard({
      requiredRole: "MAINTAINER",
      slug: "demo",
      user: { id: "user-1" },
      isAdmin: false,
      repositoryExists: true,
      membershipRole: "READER",
      teamGroupIds: [{ groupId: "team-1" }],
      teamRepoRoles: [{ role: "MAINTAINER" }],
    });
    await expect(guard.canActivate(context as never)).resolves.toBe(true);
  });
});
