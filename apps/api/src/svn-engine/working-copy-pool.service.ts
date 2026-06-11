import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { SvnEngineService } from "./svn-engine.service";

interface PooledWorkingCopy {
  wcDir: string;
  repoPath: string;
  targetPath: string;
  lastUsedAt: number;
}

@Injectable()
export class WorkingCopyPoolService implements OnModuleDestroy {
  private readonly pool = new Map<string, PooledWorkingCopy[]>();
  private readonly maxPoolSize: number;
  private readonly wcTimeoutMs: number;
  private readonly wcRoot: string;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly svnEngine: SvnEngineService,
    configService: ConfigService,
  ) {
    this.maxPoolSize = Number(configService.get<string>("SVN_WC_POOL_SIZE") ?? 3);
    this.wcTimeoutMs = Number(configService.get<string>("SVN_WC_TIMEOUT_MS") ?? 300_000);
    this.wcRoot = path.resolve(
      configService.get<string>("SVN_WC_ROOT") ?? path.join(os.tmpdir(), "svnhub-wc"),
    );
    this.cleanupTimer = setInterval(() => {
      void this.evictStale();
    }, 60_000);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    for (const entries of this.pool.values()) {
      for (const entry of entries) {
        await this.destroyWorkingCopy(entry.wcDir);
      }
    }
    this.pool.clear();
  }

  async withWorkingCopy<T>(
    repoPath: string,
    targetPath: string,
    fn: (wcDir: string) => Promise<T>,
  ): Promise<T> {
    const entry = await this.acquire(repoPath, targetPath);
    try {
      await this.svnEngine.revertWorkingCopy(entry.wcDir);
      await this.svnEngine.updateWorkingCopy(entry.wcDir);
      return await fn(entry.wcDir);
    } finally {
      try {
        await this.svnEngine.revertWorkingCopy(entry.wcDir);
        await this.release(entry);
      } catch {
        await this.destroyWorkingCopy(entry.wcDir);
      }
    }
  }

  private poolKey(repoPath: string, targetPath: string): string {
    return `${repoPath}::${targetPath}`;
  }

  private async acquire(repoPath: string, targetPath: string): Promise<PooledWorkingCopy> {
    const key = this.poolKey(repoPath, targetPath);
    const available = this.pool.get(key);
    if (available && available.length > 0) {
      const entry = available.pop()!;
      entry.lastUsedAt = Date.now();
      return entry;
    }

    await mkdir(this.wcRoot, { recursive: true });
    const wcDir = await mkdtemp(path.join(this.wcRoot, "wc-"));
    await this.svnEngine.checkoutSparse(repoPath, targetPath, wcDir);

    return {
      wcDir,
      repoPath,
      targetPath,
      lastUsedAt: Date.now(),
    };
  }

  private async release(entry: PooledWorkingCopy): Promise<void> {
    const key = this.poolKey(entry.repoPath, entry.targetPath);
    const bucket = this.pool.get(key) ?? [];

    if (bucket.length >= this.maxPoolSize) {
      await this.destroyWorkingCopy(entry.wcDir);
      return;
    }

    entry.lastUsedAt = Date.now();
    bucket.push(entry);
    this.pool.set(key, bucket);
  }

  private async evictStale(): Promise<void> {
    const now = Date.now();
    for (const [key, entries] of this.pool.entries()) {
      const kept: PooledWorkingCopy[] = [];
      for (const entry of entries) {
        if (now - entry.lastUsedAt > this.wcTimeoutMs) {
          await this.destroyWorkingCopy(entry.wcDir);
        } else {
          kept.push(entry);
        }
      }
      if (kept.length > 0) {
        this.pool.set(key, kept);
      } else {
        this.pool.delete(key);
      }
    }
  }

  private async destroyWorkingCopy(wcDir: string): Promise<void> {
    await rm(wcDir, { recursive: true, force: true });
  }
}
