import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { patHasScope } from "@svnhub/shared";

import { PrismaService } from "../../prisma/prisma.service";
import type { AuthenticatedUser } from "../strategies/jwt.strategy";

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("Authentication required");
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { isAdmin: true },
    });

    if (!dbUser?.isAdmin) {
      throw new ForbiddenException("Admin access required");
    }

    if (user.tokenScopes && !patHasScope(user.tokenScopes, "admin")) {
      throw new ForbiddenException("Insufficient token scope");
    }

    return true;
  }
}
