import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { createReadStream } from "node:fs";
import { rm } from "node:fs/promises";

import { DEFAULT_BRANCH_UI } from "@svnhub/shared";

import type { AuthenticatedUser } from "../auth/strategies/jwt.strategy";
import { AdminGuard } from "../auth/guards/admin.guard";
import { RepoRole } from "../common/decorators/repo-role.decorator";
import { ChangelogService } from "./changelog.service";
import { CreateRepositoryDto } from "./dto/create-repository.dto";
import { DiffPathsQueryDto, LogQueryDto, TreeQueryDto } from "./dto/query.dto";
import {
  ActivityQueryDto,
  ChangelogQueryDto,
  ContributorsQueryDto,
  MonthlyActivityQueryDto,
} from "./dto/stats-query.dto";
import { RepositoriesService } from "./repositories.service";
import { StatsService } from "./stats.service";

@Controller("repositories")
export class RepositoriesController {
  constructor(
    private readonly repositoriesService: RepositoriesService,
    private readonly statsService: StatsService,
    private readonly changelogService: ChangelogService,
  ) {}

  @Get()
  list(@Req() req: { user?: AuthenticatedUser }) {
    return this.repositoriesService.list(req.user?.id);
  }

  @Post()
  @UseGuards(AdminGuard)
  create(
    @Body() dto: CreateRepositoryDto,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    return this.repositoriesService.create({
      ...dto,
      actorUserId: req.user?.id,
    });
  }

  @Get(":slug")
  @RepoRole("READER")
  findOne(@Param("slug") slug: string) {
    return this.repositoriesService.findBySlug(slug);
  }

  @Patch(":slug/archive")
  @RepoRole("MAINTAINER")
  archive(@Param("slug") slug: string) {
    return this.repositoriesService.archive(slug);
  }

  @Delete(":slug")
  @RepoRole("OWNER")
  remove(@Param("slug") slug: string) {
    return this.repositoriesService.remove(slug);
  }

  @Get(":slug/tree")
  @RepoRole("READER")
  tree(@Param("slug") slug: string, @Query() query: TreeQueryDto) {
    return this.repositoriesService.getTree(
      slug,
      query.ref ?? DEFAULT_BRANCH_UI,
      query.path ?? "",
      query.revision,
      query.kind ?? "branch",
    );
  }

  @Get(":slug/content")
  @RepoRole("READER")
  content(@Param("slug") slug: string, @Query() query: TreeQueryDto) {
    if (!query.path) {
      throw new BadRequestException("path query parameter is required");
    }
    return this.repositoriesService.getFileContent(
      slug,
      query.ref ?? DEFAULT_BRANCH_UI,
      query.path,
      query.revision,
      query.kind ?? "branch",
    );
  }

  @Get(":slug/stats/activity")
  @RepoRole("READER")
  @Header("Cache-Control", "public, max-age=60")
  activity(@Param("slug") slug: string, @Query() query: ActivityQueryDto) {
    return this.statsService.getWeeklyActivity(slug, query.weeks ?? 52);
  }

  @Get(":slug/stats/contributors")
  @RepoRole("READER")
  contributors(@Param("slug") slug: string, @Query() query: ContributorsQueryDto) {
    return this.statsService.getContributors(slug, query);
  }

  @Get(":slug/stats/monthly")
  @RepoRole("READER")
  @Header("Cache-Control", "public, max-age=60")
  monthly(@Param("slug") slug: string, @Query() query: MonthlyActivityQueryDto) {
    return this.statsService.getMonthlyActivity(slug, query.months ?? 12);
  }

  @Get(":slug/stats/author-distribution")
  @RepoRole("READER")
  @Header("Cache-Control", "public, max-age=60")
  authorDistribution(@Param("slug") slug: string) {
    return this.statsService.getAuthorDistribution(slug);
  }

  @Get(":slug/changelog")
  @RepoRole("READER")
  changelog(@Param("slug") slug: string, @Query() query: ChangelogQueryDto) {
    return this.changelogService.getChangelog(slug, query.limit ?? 100);
  }

  @Get(":slug/log")
  @RepoRole("READER")
  log(@Param("slug") slug: string, @Query() query: LogQueryDto) {
    return this.repositoriesService.getLog(slug, query);
  }

  @Get(":slug/revisions/:revision")
  @RepoRole("READER")
  revision(
    @Param("slug") slug: string,
    @Param("revision", ParseIntPipe) revision: number,
  ) {
    return this.repositoriesService.getRevisionDetail(slug, revision);
  }

  @Get(":slug/diff")
  @RepoRole("READER")
  diff(@Param("slug") slug: string, @Query() query: DiffPathsQueryDto) {
    return this.repositoriesService.getDiffBetweenPaths(
      slug,
      query.sourcePath,
      query.targetPath,
      query.sourceRevision,
      query.targetRevision,
    );
  }

  @Get(":slug/blame")
  @RepoRole("READER")
  blame(@Param("slug") slug: string, @Query() query: TreeQueryDto) {
    if (!query.path) {
      throw new BadRequestException("path query parameter is required");
    }
    return this.repositoriesService.getBlame(
      slug,
      query.ref ?? DEFAULT_BRANCH_UI,
      query.path,
      query.revision,
      query.kind ?? "branch",
    );
  }

  @Get(":slug/export")
  @RepoRole("READER")
  async export(
    @Param("slug") slug: string,
    @Query() query: TreeQueryDto,
    @Res() res: Response,
  ) {
    const zipPath = await this.repositoriesService.exportZip(
      slug,
      query.ref ?? DEFAULT_BRANCH_UI,
      query.path ?? "",
      query.revision,
      query.kind ?? "branch",
    );

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${slug}-${query.ref ?? DEFAULT_BRANCH_UI}.zip"`,
    );

    const stream = createReadStream(zipPath);
    stream.pipe(res);
    stream.on("close", () => {
      void rm(zipPath, { force: true });
      void rm(zipPath.replace(/[^/\\]+$/, ""), { recursive: true, force: true });
    });
  }
}
