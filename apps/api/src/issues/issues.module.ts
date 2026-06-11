import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { WebhooksModule } from "../webhooks/webhooks.module";
import { IssueCrossRefService } from "./issue-cross-ref.service";
import { IssuesController } from "./issues.controller";
import { IssuesService, LabelsService } from "./issues.service";
import { LabelsController } from "./labels.controller";

@Module({
  imports: [AuditModule, WebhooksModule, NotificationsModule],
  controllers: [IssuesController, LabelsController],
  providers: [IssuesService, LabelsService, IssueCrossRefService],
  exports: [IssuesService, IssueCrossRefService],
})
export class IssuesModule {}
