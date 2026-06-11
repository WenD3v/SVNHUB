import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import type {
  AdminUserEntry,
  AdminUsersListResponse,
  ChangePasswordRequest,
  CreateAdminUserRequest,
  ResetAdminUserPasswordRequest,
  UpdateAdminUserRequest,
  UpdateProfileRequest,
  UserProfile,
} from "@svnhub/shared";
import * as argon2 from "argon2";

import { AuditService } from "../audit/audit.service";
import { EmailService } from "../email/email.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuthzService } from "../permissions/authz.service";
import { HtpasswdService } from "../permissions/htpasswd.service";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly htpasswdService: HtpasswdService,
    private readonly authzService: AuthzService,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
  ) {}

  async listAdmin(input: {
    search?: string;
    status?: "active" | "inactive" | "all";
    limit?: number;
    offset?: number;
  }): Promise<AdminUsersListResponse> {
    const limit = input.limit ?? 50;
    const offset = input.offset ?? 0;
    const status = input.status ?? "all";

    const where: {
      OR?: Array<{ username: { contains: string; mode: "insensitive" } } | { email: { contains: string; mode: "insensitive" } }>;
      isActive?: boolean;
    } = {};

    if (input.search?.trim()) {
      const term = input.search.trim();
      where.OR = [
        { username: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
      ];
    }

    if (status === "active") {
      where.isActive = true;
    } else if (status === "inactive") {
      where.isActive = false;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          isLocal: true,
          isAdmin: true,
          isActive: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const lastLogins = await this.getLastLoginMap(users.map((user) => user.id));

    return {
      users: users.map((user) => this.toAdminEntry(user, lastLogins.get(user.id) ?? null)),
      total,
    };
  }

  async createAdmin(
    input: CreateAdminUserRequest,
    actorUserId: string,
    ipAddress?: string | null,
  ): Promise<AdminUserEntry> {
    await this.assertUniqueEmailAndUsername(input.email, input.username);

    const passwordHash = await argon2.hash(input.password);

    const user = await this.prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        username: input.username.toLowerCase(),
        displayName: input.displayName ?? input.username,
        passwordHash,
        isLocal: true,
        isAdmin: input.isAdmin ?? false,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        isLocal: true,
        isAdmin: true,
        isActive: true,
        createdAt: true,
      },
    });

    await this.htpasswdService.upsertUser(user.username, input.password);

    await this.auditService.log({
      userId: actorUserId,
      action: "user.create",
      resourceType: "user",
      resourceId: user.id,
      metadata: { username: user.username, email: user.email },
      ipAddress,
    });

    return this.toAdminEntry(user, null);
  }

  async updateAdmin(
    id: string,
    input: UpdateAdminUserRequest,
    actorUserId: string,
    ipAddress?: string | null,
  ): Promise<AdminUserEntry> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("User not found");
    }

    if (input.email && input.email.toLowerCase() !== existing.email) {
      await this.assertUniqueEmail(input.email, id);
    }

    if (input.isActive === false && existing.isAdmin && existing.id === actorUserId) {
      throw new ForbiddenException("You cannot deactivate your own admin account");
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        email: input.email?.toLowerCase(),
        displayName: input.displayName,
        isAdmin: input.isAdmin,
        isActive: input.isActive,
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        isLocal: true,
        isAdmin: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (input.isActive === false && existing.isActive) {
      await this.handleDeactivation(existing.id, existing.username, existing.isLocal);
    }

    await this.auditService.log({
      userId: actorUserId,
      action: input.isActive === false ? "user.deactivate" : "user.update",
      resourceType: "user",
      resourceId: user.id,
      metadata: input as Record<string, unknown>,
      ipAddress,
    });

    const lastLogins = await this.getLastLoginMap([user.id]);
    return this.toAdminEntry(user, lastLogins.get(user.id) ?? null);
  }

  async resetPasswordAdmin(
    id: string,
    input: ResetAdminUserPasswordRequest,
    actorUserId: string,
    ipAddress?: string | null,
  ): Promise<AdminUserEntry> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("User not found");
    }

    if (!existing.isLocal) {
      throw new BadRequestException("Cannot reset password for LDAP users");
    }

    const passwordHash = await argon2.hash(input.password);

    const user = await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        isLocal: true,
        isAdmin: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (user.isActive) {
      await this.htpasswdService.upsertUser(user.username, input.password);
    }

    await this.auditService.log({
      userId: actorUserId,
      action: "user.reset_password",
      resourceType: "user",
      resourceId: user.id,
      ipAddress,
    });

    await this.emailService.sendPasswordResetEmail({
      email: user.email,
      username: user.username,
      password: input.password,
    });

    const lastLogins = await this.getLastLoginMap([user.id]);
    return this.toAdminEntry(user, lastLogins.get(user.id) ?? null);
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  async updateProfile(userId: string, input: UpdateProfileRequest): Promise<UserProfile> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        displayName: input.displayName,
        bio: input.bio,
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
      },
    });

    await this.auditService.log({
      userId,
      action: "user.profile.update",
      resourceType: "user",
      resourceId: userId,
    });

    return user;
  }

  async changePassword(
    userId: string,
    input: ChangePasswordRequest,
    ipAddress?: string | null,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (!user.isLocal || !user.passwordHash) {
      throw new BadRequestException("Password change is only available for local accounts");
    }

    const valid = await argon2.verify(user.passwordHash, input.currentPassword);
    if (!valid) {
      throw new UnauthorizedException("Current password is incorrect");
    }

    const passwordHash = await argon2.hash(input.newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    if (user.isActive) {
      await this.htpasswdService.upsertUser(user.username, input.newPassword);
    }

    await this.auditService.log({
      userId,
      action: "user.password.change",
      resourceType: "user",
      resourceId: userId,
      ipAddress,
    });
  }

  async findByUsername(username: string): Promise<{ id: string; username: string } | null> {
    const user = await this.prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true, username: true, isActive: true },
    });

    if (!user?.isActive) {
      return null;
    }

    return { id: user.id, username: user.username };
  }

  private async handleDeactivation(userId: string, username: string, isLocal: boolean): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });

    if (isLocal) {
      await this.htpasswdService.removeUser(username);
    }

    await this.authzService.rebuildAll();
  }

  private async getLastLoginMap(userIds: string[]): Promise<Map<string, Date>> {
    if (userIds.length === 0) {
      return new Map();
    }

    const rows = await this.prisma.auditLog.groupBy({
      by: ["userId"],
      where: {
        userId: { in: userIds },
        action: "auth.login",
      },
      _max: { createdAt: true },
    });

    const map = new Map<string, Date>();
    for (const row of rows) {
      if (row.userId && row._max.createdAt) {
        map.set(row.userId, row._max.createdAt);
      }
    }
    return map;
  }

  private async assertUniqueEmailAndUsername(email: string, username: string): Promise<void> {
    const [emailConflict, usernameConflict] = await Promise.all([
      this.prisma.user.findUnique({ where: { email: email.toLowerCase() } }),
      this.prisma.user.findUnique({ where: { username: username.toLowerCase() } }),
    ]);

    if (emailConflict) {
      throw new ConflictException("Email already in use");
    }
    if (usernameConflict) {
      throw new ConflictException("Username already in use");
    }
  }

  private async assertUniqueEmail(email: string, excludeId: string): Promise<void> {
    const conflict = await this.prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        NOT: { id: excludeId },
      },
    });

    if (conflict) {
      throw new ConflictException("Email already in use");
    }
  }

  private toAdminEntry(
    user: {
      id: string;
      email: string;
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
      isLocal: boolean;
      isAdmin: boolean;
      isActive: boolean;
      createdAt: Date;
    },
    lastLoginAt: Date | null,
  ): AdminUserEntry {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      isLocal: user.isLocal,
      isAdmin: user.isAdmin,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: lastLoginAt?.toISOString() ?? null,
    };
  }
}
