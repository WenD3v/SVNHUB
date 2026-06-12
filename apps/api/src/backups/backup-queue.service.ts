import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue, Worker } from "bullmq";

import { BACKUPS_QUEUE } from "../queues/queue.constants";
import { BackupsService } from "./backups.service";

export type BackupJobName = "hotcopy-all" | "hotcopy-repo" | "verify-all" | "verify-repo";

@Injectable()
export class BackupQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BackupQueueService.name);
  private readonly queue: Queue;
  private worker: Worker | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly backupsService: BackupsService,
  ) {
    const redisUrl = this.configService.get<string>("REDIS_URL") ?? "redis://localhost:6379";
    this.queue = new Queue(BACKUPS_QUEUE, {
      connection: { url: redisUrl, maxRetriesPerRequest: null },
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 100,
        attempts: 2,
      },
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      const redisUrl = this.configService.get<string>("REDIS_URL") ?? "redis://localhost:6379";
      this.worker = new Worker(
        BACKUPS_QUEUE,
        async (job) => {
          switch (job.name as BackupJobName) {
            case "hotcopy-all":
              await this.backupsService.runHotcopyForAllRepositories();
              break;
            case "hotcopy-repo":
              await this.backupsService.runHotcopy(job.data.repositoryId as string);
              break;
            case "verify-all":
              await this.backupsService.runVerifyForAllRepositories();
              break;
            case "verify-repo":
              await this.backupsService.runVerify(job.data.repositoryId as string);
              break;
            default:
              throw new Error(`Unknown backup job: ${job.name}`);
          }
        },
        { connection: { url: redisUrl, maxRetriesPerRequest: null } },
      );

      await this.syncRepeatableJobs();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to initialize backup queue on startup: ${message}`);
    }
  }

  async syncRepeatableJobs(): Promise<void> {
    const settings = await this.backupsService.getSettings();
    const repeatable = await this.queue.getRepeatableJobs();
    for (const job of repeatable) {
      await this.queue.removeRepeatableByKey(job.key);
    }

    await this.queue.add(
      "hotcopy-all",
      {},
      { repeat: { pattern: settings.backupCron }, jobId: "schedule-hotcopy" },
    );
    await this.queue.add(
      "verify-all",
      {},
      { repeat: { pattern: settings.verifyCron }, jobId: "schedule-verify" },
    );
  }

  async enqueueHotcopy(repositoryId: string): Promise<void> {
    await this.queue.add("hotcopy-repo", { repositoryId });
  }

  async enqueueVerify(repositoryId: string): Promise<void> {
    await this.queue.add("verify-repo", { repositoryId });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue.close();
  }
}
