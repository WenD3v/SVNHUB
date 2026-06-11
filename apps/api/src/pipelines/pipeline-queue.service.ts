import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue } from "bullmq";

import type { PipelineRunPayload } from "@svnhub/shared";

import { PIPELINES_QUEUE } from "../queues/queue.constants";

@Injectable()
export class PipelineQueueService implements OnModuleDestroy {
  private readonly queue: Queue;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>("REDIS_URL") ?? "redis://localhost:6379";
    this.queue = new Queue(PIPELINES_QUEUE, {
      connection: { url: redisUrl, maxRetriesPerRequest: null },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 200,
        attempts: 1,
      },
    });
  }

  async enqueueRun(payload: PipelineRunPayload): Promise<void> {
    await this.queue.add("run", payload, {
      jobId: payload.pipelineId,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
