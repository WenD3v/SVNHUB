import { Injectable, OnModuleDestroy } from "@nestjs/common";
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

@Injectable()
export class WebhookQueueService implements OnModuleDestroy {
  private readonly queue: Queue;
  private readonly worker: Worker;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>("REDIS_URL") ?? "redis://localhost:6379";
    const connection = { url: redisUrl, maxRetriesPerRequest: null };

    this.queue = new Queue(WEBHOOKS_QUEUE, { connection });
    this.worker = new Worker(
      WEBHOOKS_QUEUE,
      async (job) => this.deliver(job.data as WebhookDeliveryJob),
      {
        connection,
        concurrency: 5,
      },
    );
  }

  async enqueueDelivery(data: WebhookDeliveryJob): Promise<void> {
    await this.queue.add("deliver", data, {
      attempts: 5,
      backoff: { type: "exponential", delay: 2000 },
    });
  }

  private async deliver(data: WebhookDeliveryJob): Promise<void> {
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
