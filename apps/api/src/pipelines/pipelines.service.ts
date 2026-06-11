import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type {
  AppendJobLogRequest,
  PipelineDetail,
  PipelineListResponse,
  PipelineRunPayload,
  PipelineStatus,
  PipelineTrigger,
  RegisterArtifactRequest,
  TriggerPipelineRequest,
  UpdateJobStatusRequest,
} from "@svnhub/shared";
import {
  aggregatePipelineStatus,
  canTransitionJob,
  canTransitionPipeline,
  flattenPipelineJobs,
  parsePipelineYaml,
  pipelineConfigSvnPath,
  pipelineLogChannel,
  resolveBranchRootFromSvnPath,
} from "@svnhub/shared";

import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../queues/redis.service";
import { NotificationsService } from "../notifications/notifications.service";
import { SvnEngineService } from "../svn-engine/svn-engine.service";
import { WebhooksService } from "../webhooks/webhooks.service";
import { PipelineQueueService } from "./pipeline-queue.service";

@Injectable()
export class PipelinesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly svnEngine: SvnEngineService,
    private readonly pipelineQueue: PipelineQueueService,
    private readonly redisService: RedisService,
    private readonly webhooksService: WebhooksService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async list(slug: string, limit = 50): Promise<PipelineListResponse> {
    const repo = await this.requireRepo(slug);
    const [pipelines, total] = await Promise.all([
      this.prisma.pipeline.findMany({
        where: { repositoryId: repo.id },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      this.prisma.pipeline.count({ where: { repositoryId: repo.id } }),
    ]);

    return {
      pipelines: pipelines.map((pipeline) => this.toSummary(pipeline)),
      total,
    };
  }

  async getById(slug: string, pipelineId: string): Promise<PipelineDetail> {
    const repo = await this.requireRepo(slug);
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id: pipelineId, repositoryId: repo.id },
      include: {
        jobs: { orderBy: [{ stageName: "asc" }, { name: "asc" }] },
        artifacts: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!pipeline) {
      throw new NotFoundException("Pipeline not found");
    }
    return this.toDetail(pipeline);
  }

  async getJobLogs(slug: string, pipelineId: string, jobId: string) {
    const repo = await this.requireRepo(slug);
    const job = await this.prisma.pipelineJob.findFirst({
      where: { id: jobId, pipeline: { id: pipelineId, repositoryId: repo.id } },
      include: { logs: { orderBy: { sequence: "asc" } } },
    });
    if (!job) {
      throw new NotFoundException("Pipeline job not found");
    }
    return job.logs.map((log) => ({
      jobId: log.jobId,
      sequence: log.sequence,
      content: log.content,
      createdAt: log.createdAt.toISOString(),
    }));
  }

  async triggerManual(
    slug: string,
    input: TriggerPipelineRequest,
  ): Promise<PipelineDetail> {
    const repo = await this.requireRepo(slug);
    const revision =
      input.revision ??
      (await this.svnEngine.info(repo.svnPath)).revision;
    const branchPath = input.branchPath ?? "/trunk";

    return this.createAndEnqueue({
      repository: repo,
      revision,
      branchPath,
      trigger: "MANUAL",
    });
  }

  async cancel(slug: string, pipelineId: string): Promise<PipelineDetail> {
    const repo = await this.requireRepo(slug);
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id: pipelineId, repositoryId: repo.id },
      include: { jobs: true },
    });
    if (!pipeline) {
      throw new NotFoundException("Pipeline not found");
    }

    if (!canTransitionPipeline(pipeline.status, "CANCELED")) {
      throw new BadRequestException("Pipeline cannot be canceled");
    }

    const updated = await this.prisma.pipeline.update({
      where: { id: pipeline.id },
      data: {
        status: "CANCELED",
        canceledAt: new Date(),
        finishedAt: new Date(),
        jobs: {
          updateMany: {
            where: { status: { in: ["QUEUED", "RUNNING"] } },
            data: { status: "CANCELED", finishedAt: new Date() },
          },
        },
      },
      include: {
        jobs: { orderBy: [{ stageName: "asc" }, { name: "asc" }] },
        artifacts: true,
      },
    });

    await this.updatePrStatusChecks(repo.id, updated.branchPath, updated);
    return this.toDetail(updated);
  }

  async onRevisionIndexed(
    repositoryId: string,
    revision: number,
    changedPaths: string[],
  ): Promise<void> {
    const repository = await this.prisma.repository.findUnique({
      where: { id: repositoryId },
    });
    if (!repository) {
      return;
    }

    const branchPaths = new Set<string>();
    for (const changedPath of changedPaths) {
      const branchRoot = resolveBranchRootFromSvnPath(changedPath);
      if (branchRoot) {
        branchPaths.add(branchRoot);
      }
    }

    for (const branchPath of branchPaths) {
      const configYaml = await this.loadCiConfig(
        repository.svnPath,
        branchPath,
        revision,
      );
      if (!configYaml) {
        continue;
      }

      const openPr = await this.prisma.pullRequest.findFirst({
        where: {
          repositoryId: repository.id,
          sourcePath: branchPath,
          status: "OPEN",
        },
      });

      await this.createAndEnqueue({
        repository,
        revision,
        branchPath,
        trigger: openPr ? "PR" : "PUSH",
        configYaml,
      });
    }
  }

  async updateJobStatus(
    jobId: string,
    input: UpdateJobStatusRequest,
  ): Promise<void> {
    const job = await this.prisma.pipelineJob.findUnique({
      where: { id: jobId },
      include: { pipeline: { include: { jobs: true, repository: true } } },
    });
    if (!job) {
      throw new NotFoundException("Pipeline job not found");
    }

    if (!canTransitionJob(job.status, input.status)) {
      throw new BadRequestException(`Invalid job status transition`);
    }

    const now = new Date();
    await this.prisma.pipelineJob.update({
      where: { id: jobId },
      data: {
        status: input.status,
        exitCode: input.exitCode ?? null,
        startedAt: input.status === "RUNNING" ? now : job.startedAt,
        finishedAt: ["SUCCESS", "FAILURE", "CANCELED"].includes(input.status)
          ? now
          : job.finishedAt,
      },
    });

    const refreshed = await this.prisma.pipeline.findUnique({
      where: { id: job.pipelineId },
      include: { jobs: true, repository: true },
    });
    if (!refreshed) {
      return;
    }

    if (refreshed.status === "CANCELED") {
      return;
    }

    const nextStatus = aggregatePipelineStatus(
      refreshed.jobs.map((entry) => entry.status),
      refreshed.status,
    );

    const pipelineUpdate: {
      status: PipelineStatus;
      startedAt?: Date;
      finishedAt?: Date;
    } = { status: nextStatus };

    if (nextStatus === "RUNNING" && !refreshed.startedAt) {
      pipelineUpdate.startedAt = now;
    }
    if (["SUCCESS", "FAILURE", "CANCELED"].includes(nextStatus)) {
      pipelineUpdate.finishedAt = now;
    }

    const updatedPipeline = await this.prisma.pipeline.update({
      where: { id: refreshed.id },
      data: pipelineUpdate,
      include: { jobs: true, repository: true },
    });

    await this.redisService.redis.publish(
      `pipeline-status:${updatedPipeline.id}`,
      JSON.stringify({
        type: "status",
        pipelineId: updatedPipeline.id,
        status: updatedPipeline.status,
        jobId,
        jobStatus: input.status,
      }),
    );

    if (["SUCCESS", "FAILURE", "CANCELED"].includes(nextStatus)) {
      await this.onPipelineCompleted(updatedPipeline);
    }
  }

  async appendJobLog(jobId: string, input: AppendJobLogRequest): Promise<void> {
    const job = await this.prisma.pipelineJob.findUnique({
      where: { id: jobId },
      include: { pipeline: true },
    });
    if (!job) {
      throw new NotFoundException("Pipeline job not found");
    }

    await this.prisma.jobLog.create({
      data: {
        jobId,
        sequence: input.sequence,
        content: input.content,
      },
    });

    const channel = pipelineLogChannel(jobId);
    await this.redisService.redis.publish(
      channel,
      JSON.stringify({
        type: "log",
        jobId,
        sequence: input.sequence,
        content: input.content,
      }),
    );
  }

  async registerArtifact(
    jobId: string,
    input: RegisterArtifactRequest,
  ): Promise<void> {
    const job = await this.prisma.pipelineJob.findUnique({
      where: { id: jobId },
      include: { pipeline: true },
    });
    if (!job) {
      throw new NotFoundException("Pipeline job not found");
    }

    await this.prisma.artifact.create({
      data: {
        pipelineId: job.pipelineId,
        jobId,
        name: input.name,
        path: input.path,
        sizeBytes: BigInt(input.sizeBytes),
        retentionUntil: input.retentionUntil ? new Date(input.retentionUntil) : null,
      },
    });
  }

  async isPipelineCanceled(pipelineId: string): Promise<boolean> {
    const pipeline = await this.prisma.pipeline.findUnique({
      where: { id: pipelineId },
      select: { status: true },
    });
    return pipeline?.status === "CANCELED";
  }

  private async createAndEnqueue(input: {
    repository: {
      id: string;
      slug: string;
      svnPath: string;
    };
    revision: number;
    branchPath: string;
    trigger: PipelineTrigger;
    configYaml?: string;
  }): Promise<PipelineDetail> {
    const configYaml =
      input.configYaml ??
      (await this.loadCiConfig(
        input.repository.svnPath,
        input.branchPath,
        input.revision,
      ));

    if (!configYaml) {
      throw new BadRequestException(
        `No ${pipelineConfigSvnPath(input.branchPath)} found at revision ${input.revision}`,
      );
    }

    const parsed = parsePipelineYaml(configYaml);
    if (!parsed.ok) {
      throw new BadRequestException(`Invalid pipeline config: ${parsed.error}`);
    }

    const flatJobs = flattenPipelineJobs(parsed.config);
    const pipeline = await this.prisma.pipeline.create({
      data: {
        repositoryId: input.repository.id,
        revision: input.revision,
        branchPath: input.branchPath,
        trigger: input.trigger,
        status: "QUEUED",
        configYaml,
        jobs: {
          create: flatJobs.map((job) => ({
            stageName: job.stageName,
            name: job.name,
            status: "QUEUED",
            image: job.image,
            config: {
              steps: job.steps,
              env: job.env ?? {},
              artifacts: job.artifacts,
              timeout: job.timeout ?? 3600,
            },
          })),
        },
      },
      include: {
        jobs: { orderBy: [{ stageName: "asc" }, { name: "asc" }] },
        artifacts: true,
      },
    });

    await this.updatePrStatusChecks(
      input.repository.id,
      input.branchPath,
      pipeline,
    );

    const payload: PipelineRunPayload = {
      pipelineId: pipeline.id,
      repositoryId: input.repository.id,
      repositorySlug: input.repository.slug,
      svnRepoPath: input.repository.svnPath,
      revision: input.revision,
      branchPath: input.branchPath,
      jobs: pipeline.jobs.map((job) => {
        const config = job.config as {
          steps: Array<{ run: string }>;
          env: Record<string, string>;
          artifacts?: { paths: string[]; retentionDays?: number };
          timeout: number;
        };
        return {
          id: job.id,
          stageName: job.stageName,
          name: job.name,
          image: job.image ?? "alpine:latest",
          steps: config.steps,
          env: config.env ?? {},
          artifactPaths: config.artifacts?.paths ?? [],
          artifactRetentionDays: config.artifacts?.retentionDays,
          timeoutSeconds: config.timeout ?? 3600,
        };
      }),
    };

    await this.pipelineQueue.enqueueRun(payload);
    return this.toDetail(pipeline);
  }

  private async onPipelineCompleted(
    pipeline: {
      id: string;
      repositoryId: string;
      branchPath: string;
      revision: number;
      status: PipelineStatus;
      repository: { slug: string };
    },
  ): Promise<void> {
    await this.updatePrStatusChecks(
      pipeline.repositoryId,
      pipeline.branchPath,
      pipeline,
    );

    await this.webhooksService.enqueueDeliveries("PIPELINE_COMPLETED", {
      repositoryId: pipeline.repositoryId,
      repositorySlug: pipeline.repository.slug,
      data: {
        pipelineId: pipeline.id,
        revision: pipeline.revision,
        branchPath: pipeline.branchPath,
        status: pipeline.status,
      },
    });

    if (pipeline.status === "FAILURE") {
      await this.notificationsService.notifyPipelineFailed({
        repositoryId: pipeline.repositoryId,
        repositorySlug: pipeline.repository.slug,
        pipelineId: pipeline.id,
        branchPath: pipeline.branchPath,
        revision: pipeline.revision,
      });
    }
  }

  private async updatePrStatusChecks(
    repositoryId: string,
    branchPath: string,
    pipeline: { id: string; status: PipelineStatus; revision: number },
  ): Promise<void> {
    const openPrs = await this.prisma.pullRequest.findMany({
      where: {
        repositoryId,
        sourcePath: branchPath,
        status: "OPEN",
      },
    });

    const checkStatus =
      pipeline.status === "SUCCESS"
        ? "SUCCESS"
        : pipeline.status === "FAILURE"
          ? "FAILURE"
          : pipeline.status === "CANCELED"
            ? "FAILURE"
            : "PENDING";

    const webOrigin = this.configService.get<string>("WEB_ORIGIN") ?? "http://localhost:3000";
    const repo = await this.prisma.repository.findUnique({
      where: { id: repositoryId },
      select: { slug: true },
    });
    const detailsUrl = repo
      ? `${webOrigin}/repos/${repo.slug}/pipelines/${pipeline.id}`
      : null;

    for (const pr of openPrs) {
      const existing = await this.prisma.pRStatusCheck.findFirst({
        where: { pullRequestId: pr.id, name: "CI" },
      });
      if (existing) {
        await this.prisma.pRStatusCheck.update({
          where: { id: existing.id },
          data: {
            status: checkStatus,
            targetRevision: pipeline.revision,
            detailsUrl,
          },
        });
      } else {
        await this.prisma.pRStatusCheck.create({
          data: {
            pullRequestId: pr.id,
            name: "CI",
            status: checkStatus,
            targetRevision: pipeline.revision,
            detailsUrl,
          },
        });
      }
    }
  }

  private async loadCiConfig(
    svnRepoPath: string,
    branchPath: string,
    revision: number,
  ): Promise<string | null> {
    const ciPath = pipelineConfigSvnPath(branchPath);
    try {
      const { content, isBinary } = await this.svnEngine.cat(
        svnRepoPath,
        ciPath,
        revision,
      );
      if (isBinary) {
        return null;
      }
      return content.toString("utf8");
    } catch {
      return null;
    }
  }

  private async requireRepo(slug: string) {
    const repo = await this.prisma.repository.findUnique({ where: { slug } });
    if (!repo) {
      throw new NotFoundException("Repository not found");
    }
    return repo;
  }

  private toSummary(pipeline: {
    id: string;
    revision: number;
    branchPath: string;
    trigger: PipelineTrigger;
    status: PipelineStatus;
    startedAt: Date | null;
    finishedAt: Date | null;
    createdAt: Date;
  }) {
    const durationMs =
      pipeline.startedAt && pipeline.finishedAt
        ? pipeline.finishedAt.getTime() - pipeline.startedAt.getTime()
        : pipeline.startedAt
          ? Date.now() - pipeline.startedAt.getTime()
          : null;

    return {
      id: pipeline.id,
      revision: pipeline.revision,
      branchPath: pipeline.branchPath,
      trigger: pipeline.trigger,
      status: pipeline.status,
      startedAt: pipeline.startedAt?.toISOString() ?? null,
      finishedAt: pipeline.finishedAt?.toISOString() ?? null,
      durationMs,
      createdAt: pipeline.createdAt.toISOString(),
    };
  }

  private toDetail(pipeline: {
    id: string;
    revision: number;
    branchPath: string;
    trigger: PipelineTrigger;
    status: PipelineStatus;
    startedAt: Date | null;
    finishedAt: Date | null;
    createdAt: Date;
    jobs: Array<{
      id: string;
      stageName: string;
      name: string;
      status: string;
      exitCode: number | null;
      startedAt: Date | null;
      finishedAt: Date | null;
    }>;
    artifacts: Array<{
      id: string;
      name: string;
      path: string;
      sizeBytes: bigint;
      retentionUntil: Date | null;
      createdAt: Date;
    }>;
  }): PipelineDetail {
    return {
      ...this.toSummary(pipeline),
      jobs: pipeline.jobs.map((job) => ({
        id: job.id,
        stageName: job.stageName,
        name: job.name,
        status: job.status as PipelineDetail["jobs"][number]["status"],
        exitCode: job.exitCode,
        startedAt: job.startedAt?.toISOString() ?? null,
        finishedAt: job.finishedAt?.toISOString() ?? null,
      })),
      artifacts: pipeline.artifacts.map((artifact) => ({
        id: artifact.id,
        name: artifact.name,
        path: artifact.path,
        sizeBytes: artifact.sizeBytes.toString(),
        retentionUntil: artifact.retentionUntil?.toISOString() ?? null,
        createdAt: artifact.createdAt.toISOString(),
      })),
    };
  }
}
