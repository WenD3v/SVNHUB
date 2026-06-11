import { forwardRef, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

import { AuditModule } from "../audit/audit.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AdminGuard } from "./guards/admin.guard";
import { InternalHookGuard } from "./guards/internal-hook.guard";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "./guards/optional-jwt-auth.guard";
import { RepoRoleGuard } from "./guards/repo-role.guard";
import { RunnerSecretGuard } from "./guards/runner-secret.guard";
import { LdapService } from "./ldap.service";
import { AccessTokenStrategy } from "./strategies/access-token.strategy";
import { JwtStrategy } from "./strategies/jwt.strategy";

@Module({
  imports: [
    forwardRef(() => AuditModule),
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: Number(config.get<string>("JWT_ACCESS_TTL_SECONDS") ?? 900),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LdapService,
    JwtStrategy,
    AccessTokenStrategy,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
    RepoRoleGuard,
    InternalHookGuard,
    RunnerSecretGuard,
    AdminGuard,
  ],
  exports: [
    AuthService,
    JwtModule,
    PassportModule,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
    RepoRoleGuard,
    InternalHookGuard,
    RunnerSecretGuard,
    AdminGuard,
  ],
})
export class AuthModule {}
