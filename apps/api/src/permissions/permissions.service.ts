import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import type {
  PathPermissionSummary,
  RepoMemberSummary,
  RepoPolicySettings,
  RepoRole,
} from "@svnhub/shared";

import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuthzService } from "./authz.service";

@Injectable()
export class PermissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authzService: AuthzService,
    private readonly auditService: AuditService,
  ) {}

  async listMembers(slug: string): Promise<RepoMemberSummary[]> {
    const repo = await this.requireRepo(slug);
    const members = await this.prisma.repoMember.findMany({
      where: { repositoryId: repo.id },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    });

    return members.map((member) => ({
      id: member.id,
      userId: member.userId,
      username: member.user.username,
      displayName: member.user.displayName,
      email: member.user.email,
      role: member.role as RepoRole,
    }));
  }

  async addMember(
    slug: string,
    userId: string,
    role: RepoRole,
    actorUserId?: string,
  ): Promise<RepoMemberSummary> {
    const repo = await this.requireRepo(slug);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const member = await this.prisma.repoMember.upsert({
      where: { userId_repositoryId: { userId, repositoryId: repo.id } },
      create: { userId, repositoryId: repo.id, role },
      update: { role },
      include: { user: true },
    });

    await this.authzService.rebuildAll();
    await this.auditService.log({
      userId: actorUserId,
      repositoryId: repo.id,
      action: "member.add",
      resourceType: "repo_member",
      resourceId: member.id,
      metadata: { userId, role },
    });

    return {
      id: member.id,
      userId: member.userId,
      username: member.user.username,
      displayName: member.user.displayName,
      email: member.user.email,
      role: member.role as RepoRole,
    };
  }

  async updateMemberRole(
    slug: string,
    memberId: string,
    role: RepoRole,
    actorUserId?: string,
  ): Promise<RepoMemberSummary> {
    const repo = await this.requireRepo(slug);
    const member = await this.prisma.repoMember.findFirst({
      where: { id: memberId, repositoryId: repo.id },
      include: { user: true },
    });
    if (!member) {
      throw new NotFoundException("Member not found");
    }

    const updated = await this.prisma.repoMember.update({
      where: { id: memberId },
      data: { role },
      include: { user: true },
    });

    await this.authzService.rebuildAll();
    await this.auditService.log({
      userId: actorUserId,
      repositoryId: repo.id,
      action: "member.update_role",
      resourceType: "repo_member",
      resourceId: memberId,
      metadata: { role },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      username: updated.user.username,
      displayName: updated.user.displayName,
      email: updated.user.email,
      role: updated.role as RepoRole,
    };
  }

  async removeMember(slug: string, memberId: string, actorUserId?: string): Promise<void> {
    const repo = await this.requireRepo(slug);
    const member = await this.prisma.repoMember.findFirst({
      where: { id: memberId, repositoryId: repo.id },
    });
    if (!member) {
      throw new NotFoundException("Member not found");
    }

    await this.prisma.repoMember.delete({ where: { id: memberId } });
    await this.authzService.rebuildAll();
    await this.auditService.log({
      userId: actorUserId,
      repositoryId: repo.id,
      action: "member.remove",
      resourceType: "repo_member",
      resourceId: memberId,
    });
  }

  async listPathPermissions(slug: string): Promise<PathPermissionSummary[]> {
    const repo = await this.requireRepo(slug);
    const permissions = await this.prisma.pathPermission.findMany({
      where: { repositoryId: repo.id },
      orderBy: [{ path: "asc" }, { createdAt: "asc" }],
    });

    const groups = await this.prisma.group.findMany({ where: { id: { in: permissions.filter((p) => p.principalType === "GROUP").map((p) => p.principalId) } } });
    const users = await this.prisma.user.findMany({ where: { id: { in: permissions.filter((p) => p.principalType === "USER").map((p) => p.principalId) } } });

    const groupMap = new Map(groups.map((g) => [g.id, g.name]));
    const userMap = new Map(users.map((u) => [u.id, u.username]));

    return permissions.map((permission) => ({
      id: permission.id,
      path: permission.path,
      principalType: permission.principalType,
      principalId: permission.principalId,
      principalName:
        permission.principalType === "GROUP"
          ? (groupMap.get(permission.principalId) ?? permission.principalId)
          : (userMap.get(permission.principalId) ?? permission.principalId),
      access: permission.access,
    }));
  }

  async upsertPathPermission(
    slug: string,
    input: {
      path: string;
      principalType: "USER" | "GROUP";
      principalId: string;
      access: "READ" | "WRITE" | "NONE";
    },
    actorUserId?: string,
  ): Promise<PathPermissionSummary> {
    const repo = await this.requireRepo(slug);
    const normalizedPath = input.path.startsWith("/") ? input.path : `/${input.path}`;

    const permission = await this.prisma.pathPermission.upsert({
      where: {
        repositoryId_path_principalType_principalId: {
          repositoryId: repo.id,
          path: normalizedPath,
          principalType: input.principalType,
          principalId: input.principalId,
        },
      },
      create: {
        repositoryId: repo.id,
        path: normalizedPath,
        principalType: input.principalType,
        principalId: input.principalId,
        access: input.access,
      },
      update: { access: input.access },
    });

    await this.authzService.rebuildAll();
    await this.auditService.log({
      userId: actorUserId,
      repositoryId: repo.id,
      action: "permission.upsert",
      resourceType: "path_permission",
      resourceId: permission.id,
      metadata: input,
    });

    const principalName = await this.resolvePrincipalName(
      input.principalType,
      input.principalId,
    );

    return {
      id: permission.id,
      path: permission.path,
      principalType: permission.principalType,
      principalId: permission.principalId,
      principalName,
      access: permission.access,
    };
  }

  async deletePathPermission(
    slug: string,
    permissionId: string,
    actorUserId?: string,
  ): Promise<void> {
    const repo = await this.requireRepo(slug);
    const permission = await this.prisma.pathPermission.findFirst({
      where: { id: permissionId, repositoryId: repo.id },
    });
    if (!permission) {
      throw new NotFoundException("Permission not found");
    }

    await this.prisma.pathPermission.delete({ where: { id: permissionId } });
    await this.authzService.rebuildAll();
    await this.auditService.log({
      userId: actorUserId,
      repositoryId: repo.id,
      action: "permission.delete",
      resourceType: "path_permission",
      resourceId: permissionId,
    });
  }

  async getPolicy(slug: string): Promise<RepoPolicySettings> {
    const repo = await this.requireRepo(slug);
    const policy = await this.ensurePolicy(repo.id);
    return this.toPolicySettings(policy);
  }

  async updatePolicy(
    slug: string,
    input: Partial<RepoPolicySettings>,
    actorUserId?: string,
  ): Promise<RepoPolicySettings> {
    const repo = await this.requireRepo(slug);
    await this.ensurePolicy(repo.id);

    const policy = await this.prisma.repoPolicy.update({
      where: { repositoryId: repo.id },
      data: {
        ...(input.blockTrunkDirectCommit !== undefined
          ? { blockTrunkDirectCommit: input.blockTrunkDirectCommit }
          : {}),
        ...(input.blockTagsWrite !== undefined ? { blockTagsWrite: input.blockTagsWrite } : {}),
        ...(input.requireCommitMessage !== undefined
          ? { requireCommitMessage: input.requireCommitMessage }
          : {}),
        ...(input.commitMessageRegex !== undefined
          ? { commitMessageRegex: input.commitMessageRegex }
          : {}),
        ...(input.maxFileSizeBytes !== undefined
          ? { maxFileSizeBytes: input.maxFileSizeBytes }
          : {}),
        ...(input.minApprovals !== undefined ? { minApprovals: input.minApprovals } : {}),
      },
    });

    await this.auditService.log({
      userId: actorUserId,
      repositoryId: repo.id,
      action: "policy.update",
      resourceType: "repo_policy",
      resourceId: policy.id,
      metadata: input as Record<string, unknown>,
    });

    return this.toPolicySettings(policy);
  }

  async listUsersForPicker(): Promise<Array<{ id: string; username: string; email: string }>> {
    const users = await this.prisma.user.findMany({
      select: { id: true, username: true, email: true },
      orderBy: { username: "asc" },
    });
    return users;
  }

  private async requireRepo(slug: string) {
    const repo = await this.prisma.repository.findUnique({ where: { slug } });
    if (!repo) {
      throw new NotFoundException("Repository not found");
    }
    return repo;
  }

  private async ensurePolicy(repositoryId: string) {
    return this.prisma.repoPolicy.upsert({
      where: { repositoryId },
      create: { repositoryId },
      update: {},
    });
  }

  private toPolicySettings(policy: {
    blockTrunkDirectCommit: boolean;
    blockTagsWrite: boolean;
    requireCommitMessage: boolean;
    commitMessageRegex: string | null;
    maxFileSizeBytes: number | null;
    minApprovals: number;
  }): RepoPolicySettings {
    return {
      blockTrunkDirectCommit: policy.blockTrunkDirectCommit,
      blockTagsWrite: policy.blockTagsWrite,
      requireCommitMessage: policy.requireCommitMessage,
      commitMessageRegex: policy.commitMessageRegex,
      maxFileSizeBytes: policy.maxFileSizeBytes,
      minApprovals: policy.minApprovals,
    };
  }

  private async resolvePrincipalName(
    principalType: "USER" | "GROUP",
    principalId: string,
  ): Promise<string> {
    if (principalType === "GROUP") {
      const group = await this.prisma.group.findUnique({ where: { id: principalId } });
      return group?.name ?? principalId;
    }
    const user = await this.prisma.user.findUnique({ where: { id: principalId } });
    return user?.username ?? principalId;
  }
}
