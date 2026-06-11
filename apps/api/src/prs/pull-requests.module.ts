import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { BranchesModule } from "../branches/branches.module";
import { SvnEngineModule } from "../svn-engine/svn-engine.module";
import { IssuesModule } from "../issues/issues.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { WebhooksModule } from "../webhooks/webhooks.module";
import { PullRequestsController } from "./pull-requests.controller";
import { PullRequestsService } from "./pull-requests.service";

@Module({
  imports: [SvnEngineModule, BranchesModule, AuditModule, AuthModule, WebhooksModule, IssuesModule, NotificationsModule],
  controllers: [PullRequestsController],
  providers: [PullRequestsService],
  exports: [PullRequestsService],
})
export class PullRequestsModule {}
