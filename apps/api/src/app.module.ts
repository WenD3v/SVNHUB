import { APP_GUARD } from "@nestjs/core";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { RepoRoleGuard } from "./auth/guards/repo-role.guard";
import { BackupsModule } from "./backups/backups.module";
import { BranchesModule } from "./branches/branches.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { HealthModule } from "./health/health.module";
import { PermissionsModule } from "./permissions/permissions.module";
import { PrismaModule } from "./prisma/prisma.module";
import { PipelinesModule } from "./pipelines/pipelines.module";
import { PullRequestsModule } from "./prs/pull-requests.module";
import { QueuesModule } from "./queues/queues.module";
import { RepositoriesModule } from "./repositories/repositories.module";
import { SearchModule } from "./search/search.module";
import { TeamsModule } from "./teams/teams.module";
import { UsersModule } from "./users/users.module";
import { WebhooksModule } from "./webhooks/webhooks.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    QueuesModule,
    AuditModule,
    HealthModule,
    AuthModule,
    BackupsModule,
    RepositoriesModule,
    BranchesModule,
    PermissionsModule,
    TeamsModule,
    PullRequestsModule,
    PipelinesModule,
    WebhooksModule,
    UsersModule,
    DashboardModule,
    SearchModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RepoRoleGuard },
  ],
})
export class AppModule {}
