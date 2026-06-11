import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { AuditService } from "../audit/audit.service";
import type { AuthzService } from "../permissions/authz.service";
import type { PrismaService } from "../prisma/prisma.service";
import { TeamsService } from "./teams.service";

function createService(deps: {
  prisma: Partial<PrismaService>;
  authz?: Partial<AuthzService>;
  audit?: Partial<AuditService>;
}) {
  return new TeamsService(
    deps.prisma as PrismaService,
    {
      rebuildAll: vi.fn(),
      ...deps.authz,
    } as unknown as AuthzService,
    {
      log: vi.fn(),
      ...deps.audit,
    } as unknown as AuditService,
  );
}

describe("TeamsService", () => {
  describe("create", () => {
    it("creates a team with a unique slug and rebuilds authz", async () => {
      const rebuildAll = vi.fn();
      const auditLog = vi.fn();

      const prisma = {
        group: {
          findUnique: vi
            .fn()
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null),
          create: vi.fn().mockResolvedValue({
            id: "team-1",
            slug: "platform",
            name: "Platform",
            description: "Core team",
            _count: { members: 0 },
          }),
        },
      };

      const service = createService({
        prisma: prisma as unknown as Partial<PrismaService>,
        authz: { rebuildAll },
        audit: { log: auditLog },
      });

      const result = await service.create("Platform", "Core team", "admin-1");

      expect(result).toEqual({
        id: "team-1",
        slug: "platform",
        name: "Platform",
        description: "Core team",
        memberCount: 0,
      });
      expect(rebuildAll).toHaveBeenCalledOnce();
      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: "team.create", resourceId: "team-1" }),
      );
    });

    it("rejects duplicate team names", async () => {
      const prisma = {
        group: {
          findUnique: vi.fn().mockResolvedValue({ id: "existing" }),
        },
      };

      const service = createService({ prisma: prisma as unknown as Partial<PrismaService> });

      await expect(service.create("Platform")).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe("addMember", () => {
    it("allows team admins to add members", async () => {
      const rebuildAll = vi.fn();

      const prisma = {
        group: {
          findUnique: vi.fn().mockResolvedValue({ id: "team-1", slug: "platform" }),
        },
        user: {
          findUnique: vi.fn().mockResolvedValue({ id: "user-1", isAdmin: false }),
          findUniqueOrThrow: vi.fn(),
        },
        groupMember: {
          findUnique: vi.fn().mockResolvedValue({ role: "ADMIN" }),
          upsert: vi.fn().mockResolvedValue({}),
        },
      };

      prisma.user.findUnique = vi
        .fn()
        .mockResolvedValueOnce({ isAdmin: false })
        .mockResolvedValueOnce({ id: "user-2" });

      prisma.group.findUnique = vi
        .fn()
        .mockResolvedValueOnce({ id: "team-1", slug: "platform" })
        .mockResolvedValueOnce({
          id: "team-1",
          slug: "platform",
          name: "Platform",
          description: null,
          _count: { members: 1 },
          members: [
            {
              id: "member-1",
              userId: "user-2",
              role: "MEMBER",
              user: { username: "dev", displayName: "Developer" },
            },
          ],
          repoTeams: [],
        });

      const service = createService({
        prisma: prisma as unknown as Partial<PrismaService>,
        authz: { rebuildAll },
      });

      const result = await service.addMember("platform", "user-2", "MEMBER", "user-1");

      expect(result.members).toHaveLength(1);
      expect(rebuildAll).toHaveBeenCalledOnce();
    });

    it("rejects non-admin users from managing members", async () => {
      const prisma = {
        group: {
          findUnique: vi.fn().mockResolvedValue({ id: "team-1", slug: "platform" }),
        },
        user: {
          findUnique: vi.fn().mockResolvedValue({ isAdmin: false }),
        },
        groupMember: {
          findUnique: vi.fn().mockResolvedValue({ role: "MEMBER" }),
        },
      };

      const service = createService({ prisma: prisma as unknown as Partial<PrismaService> });

      await expect(
        service.addMember("platform", "user-2", "MEMBER", "user-1"),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe("linkRepoTeam", () => {
    it("links a team to a repository and rebuilds authz", async () => {
      const rebuildAll = vi.fn();
      const auditLog = vi.fn();

      const prisma = {
        repository: {
          findUnique: vi.fn().mockResolvedValue({ id: "repo-1", slug: "demo" }),
        },
        group: {
          findUnique: vi.fn().mockResolvedValue({
            id: "team-1",
            slug: "platform",
            name: "Platform",
          }),
        },
        repoTeam: {
          upsert: vi.fn().mockResolvedValue({
            id: "link-1",
            groupId: "team-1",
            role: "DEVELOPER",
            group: { slug: "platform", name: "Platform" },
          }),
        },
      };

      const service = createService({
        prisma: prisma as unknown as Partial<PrismaService>,
        authz: { rebuildAll },
        audit: { log: auditLog },
      });

      const result = await service.linkRepoTeam(
        "demo",
        { teamSlug: "platform", role: "DEVELOPER" },
        "maintainer-1",
      );

      expect(result).toEqual({
        id: "link-1",
        teamId: "team-1",
        teamSlug: "platform",
        teamName: "Platform",
        role: "DEVELOPER",
      });
      expect(rebuildAll).toHaveBeenCalledOnce();
      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: "repo_team.link", resourceId: "link-1" }),
      );
    });

    it("throws when repository is missing", async () => {
      const prisma = {
        repository: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      };

      const service = createService({ prisma: prisma as unknown as Partial<PrismaService> });

      await expect(
        service.linkRepoTeam("missing", { teamSlug: "platform", role: "READER" }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
