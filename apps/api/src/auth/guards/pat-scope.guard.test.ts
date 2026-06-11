import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";

import { AdminGuard } from "./admin.guard";
import { RepoRoleGuard } from "./repo-role.guard";
import type { PrismaService } from "../../prisma/prisma.service";

describe("PAT scope enforcement", () => {
  describe("RepoRoleGuard", () => {
    function createGuard(options: {
      requiredRole?: string;
      user?: { id: string; tokenScopes?: string[] };
      slug?: string;
      membershipRole?: string;
    }) {
      const reflector = {
        getAllAndOverride: vi.fn().mockReturnValue(options.requiredRole),
      } as unknown as Reflector;

      const prisma = {
        user: {
          findUnique: vi.fn().mockResolvedValue({ isAdmin: false }),
        },
        repository: {
          findUnique: vi.fn().mockResolvedValue({ id: "repo-1" }),
        },
        repoMember: {
          findUnique: vi.fn().mockResolvedValue(
            options.membershipRole ? { role: options.membershipRole } : null,
          ),
        },
        groupMember: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        repoTeam: {
          findMany: vi.fn().mockResolvedValue([]),
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

    it("allows repo:read tokens on READER endpoints", async () => {
      const { guard, context } = createGuard({
        requiredRole: "READER",
        slug: "demo",
        user: { id: "user-1", tokenScopes: ["repo:read"] },
        membershipRole: "READER",
      });
      await expect(guard.canActivate(context as never)).resolves.toBe(true);
    });

    it("rejects repo:read tokens on write endpoints", async () => {
      const { guard, context } = createGuard({
        requiredRole: "DEVELOPER",
        slug: "demo",
        user: { id: "user-1", tokenScopes: ["repo:read"] },
        membershipRole: "DEVELOPER",
      });
      await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("allows repo:write tokens on write endpoints", async () => {
      const { guard, context } = createGuard({
        requiredRole: "DEVELOPER",
        slug: "demo",
        user: { id: "user-1", tokenScopes: ["repo:write"] },
        membershipRole: "DEVELOPER",
      });
      await expect(guard.canActivate(context as never)).resolves.toBe(true);
    });

    it("allows legacy api tokens on write endpoints", async () => {
      const { guard, context } = createGuard({
        requiredRole: "MAINTAINER",
        slug: "demo",
        user: { id: "user-1", tokenScopes: ["api"] },
        membershipRole: "MAINTAINER",
      });
      await expect(guard.canActivate(context as never)).resolves.toBe(true);
    });
  });

  describe("AdminGuard", () => {
    function createGuard(user?: { id: string; tokenScopes?: string[] }) {
      const prisma = {
        user: {
          findUnique: vi.fn().mockResolvedValue({ isAdmin: true }),
        },
      } as unknown as PrismaService;

      const guard = new AdminGuard(prisma);
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ user }),
        }),
      };

      return { guard, context };
    }

    it("rejects admin routes for repo-only tokens", async () => {
      const { guard, context } = createGuard({
        id: "admin-1",
        tokenScopes: ["repo:write"],
      });
      await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("allows admin routes for admin-scoped tokens", async () => {
      const { guard, context } = createGuard({
        id: "admin-1",
        tokenScopes: ["admin"],
      });
      await expect(guard.canActivate(context as never)).resolves.toBe(true);
    });
  });
});
