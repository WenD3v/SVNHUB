import { Module } from "@nestjs/common";

import { WebhookQueueService } from "./webhook-queue.service";
import { WebhooksController } from "./webhooks.controller";
import { WebhooksService } from "./webhooks.service";

@Module({
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhookQueueService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
