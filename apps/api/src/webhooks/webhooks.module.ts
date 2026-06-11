import { Module, forwardRef } from "@nestjs/common";

import { EmailModule } from "../email/email.module";
import { WebhookEmailBridge } from "./webhook-email-bridge";
import { WebhookQueueService } from "./webhook-queue.service";
import { WebhooksController } from "./webhooks.controller";
import { WebhooksService } from "./webhooks.service";

@Module({
  imports: [forwardRef(() => EmailModule)],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhookQueueService, WebhookEmailBridge],
  exports: [WebhooksService, WebhookQueueService],
})
export class WebhooksModule {}
