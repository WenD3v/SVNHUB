import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import type {
  GroupRole,
  LinkRepoTeamRequest,
  RepoRole,
  RepoTeamSummary,
  TeamDetail,
  TeamSummary,
  UpdateRepoTeamRequest,
} from "@svnhub/shared";
import { slugifyTeamName } from "@svnhub/shared";

import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuthzService } from "../permissions/authz.service";

@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authzService: AuthzService,
    private readonly auditService: AuditService,
  ) {}

  async list(): Promise<TeamSummary[]> {
    const groups = await this.prisma.group.findMany({
      include: { _count: { select: { members: true } } },
      orderBy: { name: "asc" },
    });

    return groups.map((group) => this.toSummary(group));
  }

  async getBySlug(slug: string): Promise<TeamDetail> {
    const group = await this.prisma.group.findUnique({
      where: { slug },
      include: {
        members: { include: { user: true } },
        repoTeams: { include: { repository: true } },
        _count: { select: { members: true } },
      },
    });
    if (!group) {
      throw new NotFoundException("Team not found");
    }

    return this.toDetail(group);
  }

  async getById(id: string): Promise<TeamDetail> {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: {
        members: { include: { user: true } },
        repoTeams: { include: { repository: true } },
        _count: { select: { members: true } },
      },
    });
    if (!group) {
      throw new NotFoundException("Team not found");
    }

    return this.toDetail(group);
  }

  async create(
    name: string,
    description?: string,
    actorUserId?: string,
  ): Promise<TeamSummary> {
    const existing = await this.prisma.group.findUnique({ where: { name } });
    if (existing) {
      throw new ConflictException("Team already exists");
    }

    const slug = await this.allocateUniqueSlug(name);
    const group = await this.prisma.group.create({
      data: { name, slug, description: description ?? null },
      include: { _count: { select: { members: true } } },
    });

    await this.authzService.rebuildAll();
    await this.auditService.log({
      userId: actorUserId,
      action: "team.create",
      resourceType: "team",
      resourceId: group.id,
      metadata: { name, slug },
    });

    return this.toSummary(group);
  }

  async updateBySlug(
    slug: string,
    input: { name?: string; description?: string | null },
    actorUserId?: string,
  ): Promise<TeamSummary> {
    const current = await this.requireTeamBySlug(slug);

    if (input.name && input.name !== current.name) {
      const existing = await this.prisma.group.findUnique({ where: { name: input.name } });
      if (existing) {
        throw new ConflictException("Team name already exists");
      }
    }

    const group = await this.prisma.group.update({
      where: { slug },
      data: input,
      include: { _count: { select: { members: true } } },
    });

    await this.authzService.rebuildAll();
    await this.auditService.log({
      userId: actorUserId,
      action: "team.update",
      resourceType: "team",
      resourceId: group.id,
      metadata: input as Record<string, unknown>,
    });

    return this.toSummary(group);
  }

  async deleteBySlug(slug: string, actorUserId?: string): Promise<void> {
    const team = await this.requireTeamBySlug(slug);

    await this.prisma.pathPermission.deleteMany({
      where: { principalType: "GROUP", principalId: team.id },
    });
    await this.prisma.group.delete({ where: { id: team.id } });
    await this.authzService.rebuildAll();
    await this.auditService.log({
      userId: actorUserId,
      action: "team.delete",
      resourceType: "team",
      resourceId: team.id,
    });
  }

  async addMember(
    slug: string,
    userId: string,
    role: GroupRole = "MEMBER",
    actorUserId?: string,
  ): Promise<TeamDetail> {
    const team = await this.requireTeamBySlug(slug);
    await this.assertCanManageMembers(actorUserId, team.id);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    await this.prisma.groupMember.upsert({
      where: { userId_groupId: { userId, groupId: team.id } },
      create: { userId, groupId: team.id, role },
      update: { role },
    });

    await this.authzService.rebuildAll();
    await this.auditService.log({
      userId: actorUserId,
      action: "team.member.add",
      resourceType: "team",
      resourceId: team.id,
      metadata: { userId, role },
    });

    return this.getBySlug(slug);
  }

  async removeMember(
    slug: string,
    memberId: string,
    actorUserId?: string,
  ): Promise<void> {
    const team = await this.requireTeamBySlug(slug);
    await this.assertCanManageMembers(actorUserId, team.id);

    const member = await this.prisma.groupMember.findFirst({
      where: { id: memberId, groupId: team.id },
    });
    if (!member) {
      throw new NotFoundException("Member not found");
    }

    await this.prisma.groupMember.delete({ where: { id: memberId } });
    await this.authzService.rebuildAll();
    await this.auditService.log({
      userId: actorUserId,
      action: "team.member.remove",
      resourceType: "team",
      resourceId: team.id,
      metadata: { memberId },
    });
  }

  async listRepoTeams(repoSlug: string): Promise<RepoTeamSummary[]> {
    const repo = await this.requireRepo(repoSlug);
    const links = await this.prisma.repoTeam.findMany({
      where: { repositoryId: repo.id },
      include: { group: true },
      orderBy: { createdAt: "asc" },
    });

    return links.map((link) => ({
      id: link.id,
      teamId: link.groupId,
      teamSlug: link.group.slug,
      teamName: link.group.name,
      role: link.role as RepoRole,
    }));
  }

  async linkRepoTeam(
    repoSlug: string,
    input: LinkRepoTeamRequest,
    actorUserId?: string,
  ): Promise<RepoTeamSummary> {
    const repo = await this.requireRepo(repoSlug);
    const team = await this.prisma.group.findUnique({ where: { slug: input.teamSlug } });
    if (!team) {
      throw new NotFoundException("Team not found");
    }

    const link = await this.prisma.repoTeam.upsert({
      where: {
        repositoryId_groupId: { repositoryId: repo.id, groupId: team.id },
      },
      create: {
        repositoryId: repo.id,
        groupId: team.id,
        role: input.role,
      },
      update: { role: input.role },
      include: { group: true },
    });

    await this.authzService.rebuildAll();
    await this.auditService.log({
      userId: actorUserId,
      repositoryId: repo.id,
      action: "repo_team.link",
      resourceType: "repo_team",
      resourceId: link.id,
      metadata: { teamSlug: input.teamSlug, role: input.role },
    });

    return {
      id: link.id,
      teamId: link.groupId,
      teamSlug: link.group.slug,
      teamName: link.group.name,
      role: link.role as RepoRole,
    };
  }

  async updateRepoTeam(
    repoSlug: string,
    teamSlug: string,
    input: UpdateRepoTeamRequest,
    actorUserId?: string,
  ): Promise<RepoTeamSummary> {
    const repo = await this.requireRepo(repoSlug);
    const team = await this.prisma.group.findUnique({ where: { slug: teamSlug } });
    if (!team) {
      throw new NotFoundException("Team not found");
    }

    const existing = await this.prisma.repoTeam.findUnique({
      where: {
        repositoryId_groupId: { repositoryId: repo.id, groupId: team.id },
      },
    });
    if (!existing) {
      throw new NotFoundException("Team is not linked to this repository");
    }

    const link = await this.prisma.repoTeam.update({
      where: { id: existing.id },
      data: { role: input.role },
      include: { group: true },
    });

    await this.authzService.rebuildAll();
    await this.auditService.log({
      userId: actorUserId,
      repositoryId: repo.id,
      action: "repo_team.update",
      resourceType: "repo_team",
      resourceId: link.id,
      metadata: { teamSlug, role: input.role },
    });

    return {
      id: link.id,
      teamId: link.groupId,
      teamSlug: link.group.slug,
      teamName: link.group.name,
      role: link.role as RepoRole,
    };
  }

  async unlinkRepoTeam(
    repoSlug: string,
    teamSlug: string,
    actorUserId?: string,
  ): Promise<void> {
    const repo = await this.requireRepo(repoSlug);
    const team = await this.prisma.group.findUnique({ where: { slug: teamSlug } });
    if (!team) {
      throw new NotFoundException("Team not found");
    }

    const link = await this.prisma.repoTeam.findUnique({
      where: {
        repositoryId_groupId: { repositoryId: repo.id, groupId: team.id },
      },
    });
    if (!link) {
      throw new NotFoundException("Team is not linked to this repository");
    }

    await this.prisma.repoTeam.delete({ where: { id: link.id } });
    await this.authzService.rebuildAll();
    await this.auditService.log({
      userId: actorUserId,
      repositoryId: repo.id,
      action: "repo_team.unlink",
      resourceType: "repo_team",
      resourceId: link.id,
      metadata: { teamSlug },
    });
  }

  async isTeamAdmin(userId: string | undefined, teamId: string): Promise<boolean> {
    if (!userId) {
      return false;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });
    if (user?.isAdmin) {
      return true;
    }

    const membership = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId: teamId } },
      select: { role: true },
    });

    return membership?.role === "ADMIN";
  }

  private async assertCanManageMembers(
    actorUserId: string | undefined,
    teamId: string,
  ): Promise<void> {
    if (!(await this.isTeamAdmin(actorUserId, teamId))) {
      throw new ForbiddenException("Team admin privileges required");
    }
  }

  private async requireTeamBySlug(slug: string) {
    const team = await this.prisma.group.findUnique({ where: { slug } });
    if (!team) {
      throw new NotFoundException("Team not found");
    }
    return team;
  }

  private async requireRepo(slug: string) {
    const repo = await this.prisma.repository.findUnique({ where: { slug } });
    if (!repo) {
      throw new NotFoundException("Repository not found");
    }
    return repo;
  }

  private async allocateUniqueSlug(name: string): Promise<string> {
    const base = slugifyTeamName(name) || "team";
    let slug = base;
    let counter = 2;

    while (await this.prisma.group.findUnique({ where: { slug } })) {
      slug = `${base}-${counter++}`;
    }

    return slug;
  }

  private toSummary(group: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    _count: { members: number };
  }): TeamSummary {
    return {
      id: group.id,
      slug: group.slug,
      name: group.name,
      description: group.description,
      memberCount: group._count.members,
    };
  }

  private toDetail(group: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    _count: { members: number };
    members: Array<{
      id: string;
      userId: string;
      role: GroupRole;
      user: { username: string; displayName: string | null };
    }>;
    repoTeams: Array<{
      role: RepoRole;
      repository: { id: string; slug: string; name: string };
    }>;
  }): TeamDetail {
    return {
      ...this.toSummary(group),
      members: group.members.map((member) => ({
        id: member.id,
        userId: member.userId,
        username: member.user.username,
        displayName: member.user.displayName,
        role: member.role,
      })),
      repositories: group.repoTeams.map((link) => ({
        id: link.repository.id,
        slug: link.repository.slug,
        name: link.repository.name,
        role: link.role,
      })),
    };
  }
}
