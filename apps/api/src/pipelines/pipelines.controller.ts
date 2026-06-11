import {
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Body } from "@nestjs/common";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TriggerPipelineDto } from "./dto/trigger-pipeline.dto";
import { PipelinesService } from "./pipelines.service";

@Controller("repositories/:slug/pipelines")
export class PipelinesController {
  constructor(private readonly pipelinesService: PipelinesService) {}

  @Get()
  list(@Param("slug") slug: string) {
    return this.pipelinesService.list(slug);
  }

  @Get(":pipelineId")
  getById(@Param("slug") slug: string, @Param("pipelineId") pipelineId: string) {
    return this.pipelinesService.getById(slug, pipelineId);
  }

  @Get(":pipelineId/jobs/:jobId/logs")
  getJobLogs(
    @Param("slug") slug: string,
    @Param("pipelineId") pipelineId: string,
    @Param("jobId") jobId: string,
  ) {
    return this.pipelinesService.getJobLogs(slug, pipelineId, jobId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  trigger(@Param("slug") slug: string, @Body() dto: TriggerPipelineDto) {
    return this.pipelinesService.triggerManual(slug, dto);
  }

  @Post(":pipelineId/cancel")
  @UseGuards(JwtAuthGuard)
  cancel(@Param("slug") slug: string, @Param("pipelineId") pipelineId: string) {
    return this.pipelinesService.cancel(slug, pipelineId);
  }
}
