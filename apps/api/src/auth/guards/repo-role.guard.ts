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
import { hasMinimumRepoRole } from "../repo-role-level";
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

    if (!membership || !hasMinimumRepoRole(membership.role, requiredRole)) {
      throw new ForbiddenException("Insufficient repository permissions");
    }

    return true;
  }
}
