import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { describe, expect, it, vi } from "vitest";

import { AuthService } from "./auth.service";
import type { LdapService } from "./ldap.service";
import type { PrismaService } from "../prisma/prisma.service";

describe("AuthService", () => {
  it("rejects invalid local credentials", async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: "user-1",
          email: "dev@svnhub.local",
          username: "dev",
          displayName: null,
          avatarUrl: null,
          passwordHash:
            "$argon2id$v=19$m=65536,t=3,p=4$d9yjL9FQWplXUmIzzNT7MA$M5YErh+eMGk7AvgGQ121Njx/56sqYkYYx6Cm38ibNio",
          isLocal: true,
        }),
      },
    } as unknown as PrismaService;

    const ldapService = {
      isEnabled: vi.fn().mockReturnValue(false),
      authenticate: vi.fn(),
    } as unknown as LdapService;

    const auditService = {
      log: vi.fn(),
    } as unknown as import("../audit/audit.service").AuditService;

    const service = new AuthService(
      prisma,
      { signAsync: vi.fn() } as unknown as JwtService,
      new ConfigService(),
      ldapService,
      auditService,
    );

    await expect(service.login("dev@svnhub.local", "wrong-password")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("rejects login for deactivated users", async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: "user-1",
          email: "dev@svnhub.local",
          username: "dev",
          displayName: null,
          avatarUrl: null,
          passwordHash:
            "$argon2id$v=19$m=65536,t=3,p=4$d9yjL9FQWplXUmIzzNT7MA$M5YErh+eMGk7AvgGQ121Njx/56sqYkYYx6Cm38ibNio",
          isLocal: true,
          isActive: false,
        }),
      },
    } as unknown as PrismaService;

    const ldapService = {
      isEnabled: vi.fn().mockReturnValue(false),
      authenticate: vi.fn(),
    } as unknown as LdapService;

    const auditService = {
      log: vi.fn(),
    } as unknown as import("../audit/audit.service").AuditService;

    const service = new AuthService(
      prisma,
      { signAsync: vi.fn() } as unknown as JwtService,
      new ConfigService(),
      ldapService,
      auditService,
    );

    await expect(service.login("dev@svnhub.local", "any-password")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
