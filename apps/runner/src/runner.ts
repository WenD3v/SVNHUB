import { Redis } from "ioredis";

import { RunnerApiClient } from "./api-client.js";
import { DockerExecutor } from "./docker-executor.js";
import type { JobExecutor } from "./executor.js";
import { LocalProcessExecutor } from "./local-process-executor.js";
import { createPipelineWorker } from "./pipeline-worker.js";

export interface RunnerOptions {
  redisUrl: string;
  apiBaseUrl: string;
  runnerSecret?: string;
  artifactsStoragePath: string;
  svnBin: string;
  executor?: JobExecutor;
  useDocker?: boolean;
}

export interface Runner {
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

export function createRunner(options: RunnerOptions): Runner {
  const redis = new Redis(options.redisUrl, { maxRetriesPerRequest: null });
  const apiClient = new RunnerApiClient({
    baseUrl: options.apiBaseUrl,
    secret: options.runnerSecret,
  });
  const useDocker = options.useDocker ?? false;
  const executor =
    options.executor ?? (useDocker ? new DockerExecutor() : new LocalProcessExecutor());

  const worker = createPipelineWorker({
    redisUrl: options.redisUrl,
    apiClient,
    executor,
    artifactsStoragePath: options.artifactsStoragePath,
    svnBin: options.svnBin,
    useDocker,
  });

  return {
    async start() {
      worker.on("completed", (job) => {
        console.log(`[runner] pipeline job completed: ${job.id}`);
      });
      worker.on("failed", (job, error) => {
        console.error(`[runner] pipeline job failed: ${job?.id}`, error);
      });
      console.log(
        `[runner] listening on pipelines queue (executor=${useDocker ? "docker" : "local"})`,
      );
    },
    async stop() {
      await worker.close();
      await redis.quit();
    },
  };
}
