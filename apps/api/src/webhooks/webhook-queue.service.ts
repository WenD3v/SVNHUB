import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue, Worker } from "bullmq";

import type { WebhookDeliveryPayload } from "@svnhub/shared";
import { signWebhookPayload } from "@svnhub/shared";

import { WEBHOOKS_QUEUE } from "../queues/queue.constants";

export interface WebhookDeliveryJob {
  webhookId: string;
  url: string;
  secret: string;
  payload: WebhookDeliveryPayload;
}

export interface EmailJob {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

type EmailDeliverer = (job: EmailJob) => Promise<void>;

@Injectable()
export class WebhookQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(WebhookQueueService.name);
  private readonly queue: Queue;
  private readonly worker: Worker;
  private emailDeliverer: EmailDeliverer | null = null;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>("REDIS_URL") ?? "redis://localhost:6379";
    const connection = { url: redisUrl, maxRetriesPerRequest: null };

    this.queue = new Queue(WEBHOOKS_QUEUE, { connection });
    this.worker = new Worker(
      WEBHOOKS_QUEUE,
      async (job) => {
        if (job.name === "send-email") {
          if (!this.emailDeliverer) {
            throw new Error("Email delivery is not configured");
          }
          await this.emailDeliverer(job.data as EmailJob);
          return;
        }
        await this.deliverWebhook(job.data as WebhookDeliveryJob);
      },
      {
        connection,
        concurrency: 5,
      },
    );

    this.worker.on("failed", (job, error) => {
      this.logger.error(`Queue job ${job?.name ?? "unknown"} failed: ${error.message}`);
    });
  }

  registerEmailDeliverer(deliverer: EmailDeliverer): void {
    this.emailDeliverer = deliverer;
  }

  async enqueueDelivery(data: WebhookDeliveryJob): Promise<void> {
    await this.queue.add("deliver", data, {
      attempts: 5,
      backoff: { type: "exponential", delay: 2000 },
    });
  }

  async enqueueEmail(data: EmailJob): Promise<void> {
    await this.queue.add("send-email", data, {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
    });
  }

  private async deliverWebhook(data: WebhookDeliveryJob): Promise<void> {
    const body = JSON.stringify(data.payload);
    const signature = signWebhookPayload(data.secret, body);
    const response = await fetch(data.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Svnhub-Signature-256": signature,
        "X-Svnhub-Event": data.payload.event,
      },
      body,
    });
    if (!response.ok) {
      throw new Error(`Webhook delivery failed: HTTP ${response.status}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([this.queue.close(), this.worker.close()]);
  }
}
