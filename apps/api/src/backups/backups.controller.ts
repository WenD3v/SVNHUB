import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { IsInt, IsOptional, IsString, Max, Min, MinLength } from "class-validator";
import type { BackupListResponse, InstanceSettingsSummary } from "@svnhub/shared";

import { AdminGuard } from "../auth/guards/admin.guard";
import type { AuthenticatedUser } from "../auth/strategies/jwt.strategy";
import { RepoRole } from "../common/decorators/repo-role.decorator";
import { BackupQueueService } from "./backup-queue.service";
import { BackupsService } from "./backups.service";

class RecoverRepositoryDto {
  @IsString()
  @MinLength(1)
  confirmSlug!: string;
}

class UpdateInstanceSettingsDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  backupCron?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  backupRetentionCount?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  verifyCron?: string;
}

@Controller()
export class BackupsController {
  constructor(
    private readonly backupsService: BackupsService,
    private readonly backupQueueService: BackupQueueService,
  ) {}

  @Get("admin/settings/backups")
  @UseGuards(AdminGuard)
  getSettings(): Promise<InstanceSettingsSummary> {
    return this.backupsService.getSettings();
  }

  @Patch("admin/settings/backups")
  @UseGuards(AdminGuard)
  updateSettings(@Body() dto: UpdateInstanceSettingsDto): Promise<InstanceSettingsSummary> {
    return this.backupsService.updateSettings(dto);
  }

  @Get("repositories/:slug/backup-settings")
  @RepoRole("MAINTAINER")
  getRepositoryBackupSettings(): Promise<InstanceSettingsSummary> {
    return this.backupsService.getSettings();
  }

  @Get("repositories/:slug/backups")
  @RepoRole("MAINTAINER")
  listBackups(
    @Param("slug") slug: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ): Promise<BackupListResponse> {
    return this.backupsService.listBackups(
      slug,
      limit ? Number(limit) : 20,
      offset ? Number(offset) : 0,
    );
  }

  @Post("repositories/:slug/backups/run")
  @RepoRole("MAINTAINER")
  async triggerBackup(@Param("slug") slug: string) {
    const repository = await this.backupsService.requireRepositoryBySlug(slug);
    await this.backupQueueService.enqueueHotcopy(repository.id);
    return { ok: true };
  }

  @Post("repositories/:slug/verify")
  @RepoRole("MAINTAINER")
  async triggerVerify(@Param("slug") slug: string) {
    const repository = await this.backupsService.requireRepositoryBySlug(slug);
    await this.backupQueueService.enqueueVerify(repository.id);
    return { ok: true };
  }

  @Post("repositories/:slug/recover")
  @RepoRole("OWNER")
  recover(
    @Param("slug") slug: string,
    @Body() dto: RecoverRepositoryDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.backupsService.recover(slug, req.user.id, dto.confirmSlug);
  }
}
