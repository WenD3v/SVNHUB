import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { BackupListResponse, InstanceSettingsSummary, RepositoryHealthSummary } from "@svnhub/shared";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";

import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { SvnEngineService } from "../svn-engine/svn-engine.service";
import { selectBackupsForRetention } from "./backup-retention";

@Injectable()
export class BackupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly svnEngine: SvnEngineService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  getBackupRoot(): string {
    const configured = this.configService.get<string>("SVN_BACKUP_ROOT");
    return path.resolve(configured ?? path.join(this.svnEngine.getReposRoot(), "..", "backups"));
  }

  async getSettings(): Promise<InstanceSettingsSummary> {
    const settings = await this.prisma.instanceSettings.upsert({
      where: { id: "default" },
      update: {},
      create: {},
    });

    return this.toSettingsSummary(settings);
  }

  async updateSettings(input: {
    backupCron?: string;
    backupRetentionCount?: number;
    verifyCron?: string;
  }): Promise<InstanceSettingsSummary> {
    const settings = await this.prisma.instanceSettings.upsert({
      where: { id: "default" },
      update: {
        ...(input.backupCron !== undefined ? { backupCron: input.backupCron } : {}),
        ...(input.backupRetentionCount !== undefined
          ? { backupRetentionCount: input.backupRetentionCount }
          : {}),
        ...(input.verifyCron !== undefined ? { verifyCron: input.verifyCron } : {}),
      },
      create: {
        backupCron: input.backupCron ?? "0 2 * * *",
        backupRetentionCount: input.backupRetentionCount ?? 7,
        verifyCron: input.verifyCron ?? "0 3 * * 0",
      },
    });

    await this.auditService.log({
      action: "settings.backups.update",
      resourceType: "instance_settings",
      resourceId: settings.id,
      metadata: this.toSettingsSummary(settings) as unknown as Record<string, unknown>,
    });

    return this.toSettingsSummary(settings);
  }

  private toSettingsSummary(settings: {
    backupCron: string;
    backupRetentionCount: number;
    verifyCron: string;
  }): InstanceSettingsSummary {
    return {
      backupCron: settings.backupCron,
      backupRetentionCount: settings.backupRetentionCount,
      verifyCron: settings.verifyCron,
    };
  }

  async getHealth(repositoryId: string): Promise<RepositoryHealthSummary> {
    const health = await this.prisma.repositoryHealth.findUnique({
      where: { repositoryId },
    });

    if (!health) {
      return {
        status: "UNKNOWN",
        lastVerifiedAt: null,
        lastError: null,
      };
    }

    return {
      status: health.status,
      lastVerifiedAt: health.lastVerifiedAt?.toISOString() ?? null,
      lastError: health.lastError,
    };
  }

  async listBackups(slug: string, limit = 20, offset = 0): Promise<BackupListResponse> {
    const repository = await this.requireRepository(slug);
    const [rows, total] = await Promise.all([
      this.prisma.repositoryBackup.findMany({
        where: { repositoryId: repository.id },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.repositoryBackup.count({ where: { repositoryId: repository.id } }),
    ]);

    return {
      backups: rows.map((row) => ({
        id: row.id,
        path: row.path,
        sizeBytes: row.sizeBytes?.toString() ?? null,
        status: row.status,
        error: row.error,
        startedAt: row.startedAt?.toISOString() ?? null,
        finishedAt: row.finishedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
      total,
    };
  }

  async runHotcopyForAllRepositories(): Promise<void> {
    const repositories = await this.prisma.repository.findMany({ select: { id: true } });
    for (const repository of repositories) {
      await this.runHotcopy(repository.id);
    }
  }

  async runHotcopy(repositoryId: string): Promise<void> {
    const repository = await this.prisma.repository.findUnique({ where: { id: repositoryId } });
    if (!repository) {
      throw new NotFoundException("Repository not found");
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const destination = path.join(this.getBackupRoot(), repository.slug, timestamp);
    await mkdir(path.dirname(destination), { recursive: true });

    const backup = await this.prisma.repositoryBackup.create({
      data: {
        repositoryId: repository.id,
        path: destination,
        status: "RUNNING",
        startedAt: new Date(),
      },
    });

    try {
      await this.svnEngine.hotcopy(repository.svnPath, destination);
      const sizeBytes = await this.directorySize(destination);

      await this.prisma.repositoryBackup.update({
        where: { id: backup.id },
        data: {
          status: "SUCCESS",
          sizeBytes,
          finishedAt: new Date(),
        },
      });

      await this.auditService.log({
        repositoryId: repository.id,
        action: "backup.create",
        resourceType: "repository_backup",
        resourceId: backup.id,
        metadata: { path: destination },
      });

      await this.applyRetention(repository.id);
    } catch (error) {
      await this.prisma.repositoryBackup.update({
        where: { id: backup.id },
        data: {
          status: "FAILED",
          error: error instanceof Error ? error.message : "Backup failed",
          finishedAt: new Date(),
        },
      });
      throw error;
    }
  }

  async runVerifyForAllRepositories(): Promise<void> {
    const repositories = await this.prisma.repository.findMany({ select: { id: true } });
    for (const repository of repositories) {
      await this.runVerify(repository.id);
    }
  }

  async runVerify(repositoryId: string): Promise<void> {
    const repository = await this.prisma.repository.findUnique({ where: { id: repositoryId } });
    if (!repository) {
      throw new NotFoundException("Repository not found");
    }

    await this.prisma.repositoryHealth.upsert({
      where: { repositoryId: repository.id },
      update: { status: "VERIFYING", lastError: null },
      create: { repositoryId: repository.id, status: "VERIFYING" },
    });

    try {
      const output = await this.svnEngine.verify(repository.svnPath);
      await this.prisma.repositoryHealth.update({
        where: { repositoryId: repository.id },
        data: {
          status: "HEALTHY",
          lastVerifiedAt: new Date(),
          lastError: null,
          verifyOutput: output,
        },
      });

      await this.auditService.log({
        repositoryId: repository.id,
        action: "repo.verify",
        resourceType: "repository",
        resourceId: repository.id,
        metadata: { status: "HEALTHY" },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Verify failed";
      await this.prisma.repositoryHealth.update({
        where: { repositoryId: repository.id },
        data: {
          status: "UNHEALTHY",
          lastVerifiedAt: new Date(),
          lastError: message,
        },
      });

      await this.auditService.log({
        repositoryId: repository.id,
        action: "repo.verify",
        resourceType: "repository",
        resourceId: repository.id,
        metadata: { status: "UNHEALTHY", error: message },
      });
    }
  }

  async recover(
    slug: string,
    userId: string,
    confirmSlug: string,
  ): Promise<{ ok: true }> {
    const repository = await this.requireRepository(slug);
    if (confirmSlug !== repository.slug) {
      throw new BadRequestException("Confirmation slug does not match");
    }

    await this.svnEngine.recover(repository.svnPath);

    await this.auditService.log({
      userId,
      repositoryId: repository.id,
      action: "repo.recover",
      resourceType: "repository",
      resourceId: repository.id,
    });

    return { ok: true };
  }

  private async applyRetention(repositoryId: string): Promise<void> {
    const settings = await this.getSettings();
    const backups = await this.prisma.repositoryBackup.findMany({
      where: { repositoryId, status: "SUCCESS" },
      select: { id: true, path: true, createdAt: true },
    });

    const toDelete = selectBackupsForRetention(backups, settings.backupRetentionCount);
    for (const backup of toDelete) {
      if (backup.path) {
        await rm(backup.path, { recursive: true, force: true });
      }
      await this.prisma.repositoryBackup.delete({ where: { id: backup.id } });
    }
  }

  private async directorySize(root: string): Promise<bigint> {
    let total = 0n;
    const entries = await readdir(root, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(root, entry.name);
      if (entry.isDirectory()) {
        total += await this.directorySize(entryPath);
      } else {
        const fileStat = await stat(entryPath);
        total += BigInt(fileStat.size);
      }
    }
    return total;
  }

  async requireRepositoryBySlug(slug: string) {
    return this.requireRepository(slug);
  }

  private async requireRepository(slug: string) {
    const repository = await this.prisma.repository.findUnique({ where: { slug } });
    if (!repository) {
      throw new NotFoundException("Repository not found");
    }
    return repository;
  }
}
