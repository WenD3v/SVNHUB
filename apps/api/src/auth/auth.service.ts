import {
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { AuthResponse, AuthUser } from "@svnhub/shared";
import * as argon2 from "argon2";
import { createHash, randomBytes } from "node:crypto";

import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { LdapService } from "./ldap.service";

interface JwtPayload {
  sub: string;
  email: string;
  username: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly ldapService: LdapService,
    private readonly auditService: AuditService,
  ) {}

  async login(email: string, password: string, ipAddress?: string | null): Promise<AuthResponse> {
    const ldapProfile = this.ldapService.isEnabled()
      ? await this.ldapService.authenticate(email, password)
      : null;

    if (ldapProfile) {
      const user = await this.prisma.user.upsert({
        where: { email: ldapProfile.email },
        update: {
          ldapDn: ldapProfile.dn,
          displayName: ldapProfile.displayName,
          isLocal: false,
        },
        create: {
          email: ldapProfile.email,
          username: ldapProfile.username,
          displayName: ldapProfile.displayName,
          ldapDn: ldapProfile.dn,
          isLocal: false,
        },
      });

      this.assertUserIsActive(user.isActive);
      return this.issueTokens(user, ipAddress);
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash || !user.isLocal) {
      throw new UnauthorizedException("Invalid credentials");
    }

    this.assertUserIsActive(user.isActive);

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return this.issueTokens(user, ipAddress);
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    this.assertUserIsActive(stored.user.isActive);

    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    return this.issueTokens(stored.user);
  }

  async logout(refreshToken: string, userId?: string | null, ipAddress?: string | null): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash } });

    if (userId) {
      await this.auditService.log({
        userId,
        action: "auth.logout",
        resourceType: "session",
        ipAddress,
      });
    }
  }

  async getProfile(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        isAdmin: true,
      },
    });
    return this.toAuthUser(user);
  }

  private async issueTokens(
    user: {
      id: string;
      email: string;
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
      isAdmin?: boolean;
      isActive?: boolean;
    },
    ipAddress?: string | null,
  ): Promise<AuthResponse> {
    this.assertUserIsActive(user.isActive ?? true);
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
    };

    const expiresIn = Number(this.config.get<string>("JWT_ACCESS_TTL_SECONDS") ?? 900);
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn,
    });

    const refreshToken = randomBytes(48).toString("hex");
    const refreshTtlDays = Number(this.config.get<string>("JWT_REFRESH_TTL_DAYS") ?? 30);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshTtlDays);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
      },
    });

    await this.auditService.log({
      userId: user.id,
      action: "auth.login",
      resourceType: "session",
      ipAddress,
    });

    return {
      user: this.toAuthUser(user),
      tokens: {
        accessToken,
        refreshToken,
        expiresIn,
      },
    };
  }

  private toAuthUser(user: {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    isAdmin?: boolean;
  }): AuthUser {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      isAdmin: user.isAdmin ?? false,
    };
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private assertUserIsActive(isActive: boolean): void {
    if (!isActive) {
      throw new UnauthorizedException("Account is deactivated");
    }
  }
}
