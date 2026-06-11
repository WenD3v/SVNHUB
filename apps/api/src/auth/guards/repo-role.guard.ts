import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { RepoRole } from "@svnhub/shared";

import { REPO_ROLE_KEY } from "../../common/decorators/repo-role.decorator";
import { PrismaService } from "../../prisma/prisma.service";
import { hasMinimumRepoRole, maxRepoRole } from "../repo-role-level";
import type { AuthenticatedUser } from "../strategies/jwt.strategy";

@Injectable()
export class RepoRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRole = this.reflector.getAllAndOverride<RepoRole | undefined>(REPO_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRole) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      params?: { slug?: string };
    }>();

    const user = request.user;
    if (!user) {
      throw new ForbiddenException("Authentication required");
    }

    const slug = request.params?.slug;
    if (!slug) {
      throw new ForbiddenException("Repository slug required");
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { isAdmin: true },
    });

    if (dbUser?.isAdmin) {
      return true;
    }

    const repository = await this.prisma.repository.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!repository) {
      return true;
    }

    const membership = await this.prisma.repoMember.findUnique({
      where: {
        userId_repositoryId: {
          userId: user.id,
          repositoryId: repository.id,
        },
      },
    });

    const teamMemberships = await this.prisma.groupMember.findMany({
      where: { userId: user.id },
      select: { groupId: true },
    });

    let teamRole: RepoRole | null = null;
    if (teamMemberships.length > 0) {
      const repoTeams = await this.prisma.repoTeam.findMany({
        where: {
          repositoryId: repository.id,
          groupId: { in: teamMemberships.map((entry) => entry.groupId) },
        },
        select: { role: true },
      });
      teamRole = maxRepoRole(...repoTeams.map((entry) => entry.role as RepoRole));
    }

    const effectiveRole = maxRepoRole(
      membership?.role as RepoRole | undefined,
      teamRole ?? undefined,
    );

    if (!effectiveRole || !hasMinimumRepoRole(effectiveRole, requiredRole)) {
      throw new ForbiddenException("Insufficient repository permissions");
    }

    return true;
  }
}
