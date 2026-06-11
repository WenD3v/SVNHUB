import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import { createReadStream } from "node:fs";
import { rm } from "node:fs/promises";

import { DEFAULT_BRANCH_UI } from "@svnhub/shared";

import { RepoRole } from "../common/decorators/repo-role.decorator";
import { CreateRepositoryDto } from "./dto/create-repository.dto";
import { DiffPathsQueryDto, LogQueryDto, TreeQueryDto } from "./dto/query.dto";
import { RepositoriesService } from "./repositories.service";

@Controller("repositories")
export class RepositoriesController {
  constructor(private readonly repositoriesService: RepositoriesService) {}

  @Get()
  list() {
    return this.repositoriesService.list();
  }

  @Post()
  create(@Body() dto: CreateRepositoryDto) {
    return this.repositoriesService.create(dto);
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
