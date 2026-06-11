import { copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { PipelineRunPayload } from "@svnhub/shared";
import { Worker } from "bullmq";

import { RunnerApiClient } from "./api-client.js";
import type { JobExecutor } from "./executor.js";
import { collectArtifacts, svnExport } from "./svn.js";

export interface PipelineWorkerOptions {
  redisUrl: string;
  apiClient: RunnerApiClient;
  executor: JobExecutor;
  artifactsStoragePath: string;
  svnBin: string;
  useDocker: boolean;
}

export function createPipelineWorker(options: PipelineWorkerOptions): Worker<PipelineRunPayload> {
  return new Worker<PipelineRunPayload>(
    "pipelines",
    async (job) => {
      const payload = job.data;
      const workRoot = await mkdtemp(path.join(os.tmpdir(), "svnhub-pipeline-"));
      const sourceDir = path.join(workRoot, "source");

      try {
        await mkdir(sourceDir, { recursive: true });
        await svnExport(
          options.svnBin,
          payload.svnRepoPath,
          payload.branchPath,
          payload.revision,
          sourceDir,
        );

        for (const jobConfig of payload.jobs) {
          if (await options.apiClient.isPipelineCanceled(payload.pipelineId)) {
            await options.apiClient.updateJobStatus(jobConfig.id, {
              status: "CANCELED",
            });
            continue;
          }

          await options.apiClient.updateJobStatus(jobConfig.id, { status: "RUNNING" });

          let sequence = 0;
          const appendLog = async (content: string) => {
            await options.apiClient.appendJobLog(jobConfig.id, {
              sequence: sequence++,
              content,
            });
          };

          await appendLog(
            `[runner] executing job ${jobConfig.name} (${options.useDocker ? "docker" : "local"})\n`,
          );

          const result = await options.executor.execute({
            image: jobConfig.image,
            workdir: sourceDir,
            steps: jobConfig.steps,
            env: jobConfig.env,
            timeoutSeconds: jobConfig.timeoutSeconds,
            onOutput: (chunk) => {
              void appendLog(chunk);
            },
          });

          const jobStatus = result.exitCode === 0 ? "SUCCESS" : "FAILURE";
          await options.apiClient.updateJobStatus(jobConfig.id, {
            status: jobStatus,
            exitCode: result.exitCode,
          });

          if (jobStatus === "SUCCESS" && jobConfig.artifactPaths.length > 0) {
            const artifacts = await collectArtifacts(sourceDir, jobConfig.artifactPaths);
            const retentionUntil =
              jobConfig.artifactRetentionDays !== undefined
                ? new Date(
                    Date.now() + jobConfig.artifactRetentionDays * 24 * 60 * 60 * 1000,
                  ).toISOString()
                : undefined;

            const storageDir = path.join(
              options.artifactsStoragePath,
              payload.repositoryId,
              payload.pipelineId,
              jobConfig.id,
            );
            await mkdir(storageDir, { recursive: true });

            for (const artifact of artifacts) {
              const destination = path.join(storageDir, artifact.name);
              await mkdir(path.dirname(destination), { recursive: true });
              await copyFile(artifact.path, destination);
              await options.apiClient.registerArtifact(jobConfig.id, {
                name: artifact.name,
                path: destination,
                sizeBytes: artifact.sizeBytes,
                retentionUntil,
              });
            }
          }

          if (jobStatus === "FAILURE") {
            break;
          }
        }
      } finally {
        await rm(workRoot, { recursive: true, force: true });
      }
    },
    {
      connection: { url: options.redisUrl, maxRetriesPerRequest: null },
      concurrency: 1,
    },
  );
}
