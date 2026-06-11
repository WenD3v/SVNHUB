import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { createHash } from "node:crypto";
import { Strategy } from "passport-custom";

import { PrismaService } from "../../prisma/prisma.service";
import type { AuthenticatedUser } from "./jwt.strategy";

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, "access-token") {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async validate(req: { headers?: { authorization?: string } }): Promise<AuthenticatedUser | null> {
    const authHeader = req.headers?.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.slice(7);
    if (!token.startsWith("svnhub_")) {
      return null;
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");
    const stored = await this.prisma.accessToken.findFirst({
      where: {
        tokenHash,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedException("Invalid access token");
    }

    await this.prisma.accessToken.update({
      where: { id: stored.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      id: stored.user.id,
      email: stored.user.email,
      username: stored.user.username,
    };
  }
}
