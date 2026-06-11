import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";

import { RunnerSecretGuard } from "../auth/guards/runner-secret.guard";
import { Public } from "../common/decorators/public.decorator";
import {
  AppendJobLogDto,
  RegisterArtifactDto,
  UpdateJobStatusDto,
} from "./dto/internal-pipeline.dto";
import { PipelinesService } from "./pipelines.service";

@Public()
@UseGuards(RunnerSecretGuard)
@Controller("internal/pipelines")
export class InternalPipelinesController {
  constructor(private readonly pipelinesService: PipelinesService) {}

  @Get(":pipelineId/canceled")
  async isCanceled(@Param("pipelineId") pipelineId: string) {
    const canceled = await this.pipelinesService.isPipelineCanceled(pipelineId);
    return { canceled };
  }

  @Patch("jobs/:jobId/status")
  updateJobStatus(@Param("jobId") jobId: string, @Body() dto: UpdateJobStatusDto) {
    return this.pipelinesService.updateJobStatus(jobId, dto);
  }

  @Post("jobs/:jobId/logs")
  appendJobLog(@Param("jobId") jobId: string, @Body() dto: AppendJobLogDto) {
    return this.pipelinesService.appendJobLog(jobId, dto);
  }

  @Post("jobs/:jobId/artifacts")
  registerArtifact(@Param("jobId") jobId: string, @Body() dto: RegisterArtifactDto) {
    return this.pipelinesService.registerArtifact(jobId, dto);
  }
}
