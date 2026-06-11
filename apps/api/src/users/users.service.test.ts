import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import * as argon2 from "argon2";

import type { AuditService } from "../audit/audit.service";
import type { EmailService } from "../email/email.service";
import type { AuthzService } from "../permissions/authz.service";
import type { HtpasswdService } from "../permissions/htpasswd.service";
import type { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "./users.service";

function createService(deps: {
  prisma: Partial<PrismaService>;
  htpasswd?: Partial<HtpasswdService>;
  authz?: Partial<AuthzService>;
  audit?: Partial<AuditService>;
  email?: Partial<EmailService>;
}) {
  return new UsersService(
    deps.prisma as PrismaService,
    {
      upsertUser: vi.fn(),
      removeUser: vi.fn(),
      ...deps.htpasswd,
    } as unknown as HtpasswdService,
    {
      rebuildAll: vi.fn(),
      ...deps.authz,
    } as unknown as AuthzService,
    {
      log: vi.fn(),
      ...deps.audit,
    } as unknown as AuditService,
    {
      sendPasswordResetEmail: vi.fn(),
      ...deps.email,
    } as unknown as EmailService,
  );
}

describe("UsersService", () => {
  describe("createAdmin", () => {
    it("creates a local user and syncs htpasswd", async () => {
      const htpasswdUpsert = vi.fn();
      const auditLog = vi.fn();

      const prisma = {
        user: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({
            id: "user-1",
            email: "dev@svnhub.local",
            username: "dev",
            displayName: "Developer",
            avatarUrl: null,
            isLocal: true,
            isAdmin: false,
            isActive: true,
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
          }),
        },
        auditLog: {
          groupBy: vi.fn().mockResolvedValue([]),
        },
      };

      const service = createService({
        prisma: prisma as unknown as Partial<PrismaService>,
        htpasswd: { upsertUser: htpasswdUpsert },
        audit: { log: auditLog },
      });

      const result = await service.createAdmin(
        {
          email: "dev@svnhub.local",
          username: "dev",
          displayName: "Developer",
          password: "Secret123",
        },
        "admin-1",
      );

      expect(result.username).toBe("dev");
      expect(htpasswdUpsert).toHaveBeenCalledWith("dev", "Secret123");
      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: "user.create", resourceId: "user-1" }),
      );
    });

    it("rejects duplicate email", async () => {
      const prisma = {
        user: {
          findUnique: vi
            .fn()
            .mockResolvedValueOnce({ id: "existing" })
            .mockResolvedValueOnce(null),
        },
      };

      const service = createService({ prisma: prisma as unknown as Partial<PrismaService> });

      await expect(
        service.createAdmin(
          {
            email: "dev@svnhub.local",
            username: "dev",
            password: "Secret123",
          },
          "admin-1",
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe("updateAdmin", () => {
    it("deactivates user, revokes refresh tokens and removes htpasswd entry", async () => {
      const removeUser = vi.fn();
      const rebuildAll = vi.fn();
      const deleteMany = vi.fn();

      const prisma = {
        user: {
          findUnique: vi.fn().mockResolvedValue({
            id: "user-1",
            email: "dev@svnhub.local",
            username: "dev",
            isLocal: true,
            isAdmin: false,
            isActive: true,
          }),
          update: vi.fn().mockResolvedValue({
            id: "user-1",
            email: "dev@svnhub.local",
            username: "dev",
            displayName: "Developer",
            avatarUrl: null,
            isLocal: true,
            isAdmin: false,
            isActive: false,
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
          }),
        },
        refreshToken: {
          deleteMany,
        },
        auditLog: {
          groupBy: vi.fn().mockResolvedValue([]),
        },
      };

      const service = createService({
        prisma: prisma as unknown as Partial<PrismaService>,
        htpasswd: { removeUser },
        authz: { rebuildAll },
      });

      const result = await service.updateAdmin(
        "user-1",
        { isActive: false },
        "admin-1",
      );

      expect(result.isActive).toBe(false);
      expect(deleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
      expect(removeUser).toHaveBeenCalledWith("dev");
      expect(rebuildAll).toHaveBeenCalled();
    });

    it("prevents admin from deactivating own account", async () => {
      const prisma = {
        user: {
          findUnique: vi.fn().mockResolvedValue({
            id: "admin-1",
            email: "admin@svnhub.local",
            username: "admin",
            isLocal: true,
            isAdmin: true,
            isActive: true,
          }),
        },
      };

      const service = createService({ prisma: prisma as unknown as Partial<PrismaService> });

      await expect(
        service.updateAdmin("admin-1", { isActive: false }, "admin-1"),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe("resetPasswordAdmin", () => {
    it("rejects LDAP users", async () => {
      const prisma = {
        user: {
          findUnique: vi.fn().mockResolvedValue({
            id: "user-1",
            isLocal: false,
          }),
        },
      };

      const service = createService({ prisma: prisma as unknown as Partial<PrismaService> });

      await expect(
        service.resetPasswordAdmin("user-1", { password: "Secret123" }, "admin-1"),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("changePassword", () => {
    it("validates current password and syncs htpasswd", async () => {
      const passwordHash = await argon2.hash("OldSecret123");
      const htpasswdUpsert = vi.fn();

      const prisma = {
        user: {
          findUnique: vi.fn().mockResolvedValue({
            id: "user-1",
            username: "dev",
            isLocal: true,
            isActive: true,
            passwordHash,
          }),
          update: vi.fn().mockResolvedValue({}),
        },
      };

      const service = createService({
        prisma: prisma as unknown as Partial<PrismaService>,
        htpasswd: { upsertUser: htpasswdUpsert },
      });

      await service.changePassword("user-1", {
        currentPassword: "OldSecret123",
        newPassword: "NewSecret123",
      });

      expect(htpasswdUpsert).toHaveBeenCalledWith("dev", "NewSecret123");
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it("rejects invalid current password", async () => {
      const passwordHash = await argon2.hash("OldSecret123");

      const prisma = {
        user: {
          findUnique: vi.fn().mockResolvedValue({
            id: "user-1",
            username: "dev",
            isLocal: true,
            isActive: true,
            passwordHash,
          }),
        },
      };

      const service = createService({ prisma: prisma as unknown as Partial<PrismaService> });

      await expect(
        service.changePassword("user-1", {
          currentPassword: "WrongPassword",
          newPassword: "NewSecret123",
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe("listAdmin", () => {
    it("returns paginated users with last login from audit log", async () => {
      const prisma = {
        user: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "user-1",
              email: "dev@svnhub.local",
              username: "dev",
              displayName: "Developer",
              avatarUrl: null,
              isLocal: true,
              isAdmin: false,
              isActive: true,
              createdAt: new Date("2026-01-01T00:00:00.000Z"),
            },
          ]),
          count: vi.fn().mockResolvedValue(1),
        },
        auditLog: {
          groupBy: vi.fn().mockResolvedValue([
            {
              userId: "user-1",
              _max: { createdAt: new Date("2026-06-01T12:00:00.000Z") },
            },
          ]),
        },
      };

      const service = createService({ prisma: prisma as unknown as Partial<PrismaService> });

      const result = await service.listAdmin({ limit: 10, offset: 0 });

      expect(result.total).toBe(1);
      expect(result.users[0]?.lastLoginAt).toBe("2026-06-01T12:00:00.000Z");
    });
  });

  describe("resetPasswordAdmin missing user", () => {
    it("throws NotFoundException", async () => {
      const prisma = {
        user: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      };

      const service = createService({ prisma: prisma as unknown as Partial<PrismaService> });

      await expect(
        service.resetPasswordAdmin("missing", { password: "Secret123" }, "admin-1"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
