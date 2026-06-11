import { Injectable, OnModuleInit } from "@nestjs/common";

import { EmailService } from "../email/email.service";
import { WebhookQueueService } from "./webhook-queue.service";

@Injectable()
export class WebhookEmailBridge implements OnModuleInit {
  constructor(
    private readonly webhookQueue: WebhookQueueService,
    private readonly emailService: EmailService,
  ) {}

  onModuleInit(): void {
    if (this.emailService.isEnabled()) {
      this.webhookQueue.registerEmailDeliverer((job) => this.emailService.deliver(job));
    }
  }
}
