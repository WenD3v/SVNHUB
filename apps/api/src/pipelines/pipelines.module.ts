import { Module } from "@nestjs/common";

import { SvnEngineModule } from "../svn-engine/svn-engine.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { WebhooksModule } from "../webhooks/webhooks.module";
import { InternalPipelinesController } from "./internal-pipelines.controller";
import { PipelineLogsGateway } from "./pipeline-logs.gateway";
import { PipelineQueueService } from "./pipeline-queue.service";
import { PipelinesController } from "./pipelines.controller";
import { PipelinesService } from "./pipelines.service";

@Module({
  imports: [SvnEngineModule, WebhooksModule, NotificationsModule],
  controllers: [PipelinesController, InternalPipelinesController],
  providers: [PipelinesService, PipelineQueueService, PipelineLogsGateway],
  exports: [PipelinesService],
})
export class PipelinesModule {}
