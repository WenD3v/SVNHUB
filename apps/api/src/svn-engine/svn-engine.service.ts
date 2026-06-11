import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { spawnSync } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

import type {
  SvnBlameLine,
  SvnDiffFile,
  SvnLogEntry,
  SvnLogQuery,
  SvnRepoInfo,
  SvnTreeEntry,
} from "@svnhub/shared";

import { parseBlameXml } from "./parsers/blame.parser";
import { parseUnifiedDiff } from "./parsers/diff.parser";
import { parseInfoXml } from "./parsers/info.parser";
import { parseListXml } from "./parsers/list.parser";
import { resolveWorkspacePath } from "../config/workspace-paths";
import { parseLogXml } from "./parsers/log.parser";
import { SvnCliError, SvnCliExecutor } from "./svn-cli.executor";

export interface SvnCliRunResult {
  stdout: string;
  stderr: string;
}

export interface SvnEngineConfig {
  reposRoot: string;
  svnBin: string;
  svnadminBin: string;
  svnlookBin: string;
  timeoutMs: number;
}

@Injectable()
export class SvnEngineService {
  private readonly config: SvnEngineConfig;
  private readonly executor: SvnCliExecutor;

  constructor(configService: ConfigService) {
    this.config = {
      reposRoot: resolveWorkspacePath(
        configService.get<string>("SVN_REPOS_ROOT") ?? "data/repos",
      ),
      svnBin: configService.get<string>("SVN_BIN") ?? "svn",
      svnadminBin: configService.get<string>("SVNADMIN_BIN") ?? "svnadmin",
      svnlookBin: configService.get<string>("SVNLOOK_BIN") ?? "svnlook",
      timeoutMs: Number(configService.get<string>("SVN_CLI_TIMEOUT_MS") ?? 120_000),
    };
    this.executor = new SvnCliExecutor(this.config.timeoutMs);
  }

  getReposRoot(): string {
    return path.resolve(this.config.reposRoot);
  }

  resolveRepoPath(repoName: string): string {
    return path.join(this.getReposRoot(), `${repoName}.svn`);
  }

  fileUrl(repoPath: string, svnPath = "/"): string {
    const normalized = svnPath.startsWith("/") ? svnPath : `/${svnPath}`;
    const posixRepoPath = repoPath.replace(/\\/g, "/");
    return `file:///${posixRepoPath.replace(/^\/+/, "")}${normalized}`;
  }

  async createRepository(repoName: string): Promise<string> {
    await mkdir(this.getReposRoot(), { recursive: true });
    const repoPath = this.resolveRepoPath(repoName);

    await this.executor.run(this.config.svnadminBin, ["create", repoPath]);

    const rootUrl = this.fileUrl(repoPath);
    await this.executor.run(this.config.svnBin, [
      "mkdir",
      `${rootUrl}/trunk`,
      `${rootUrl}/branches`,
      `${rootUrl}/tags`,
      "-m",
      "Initial repository layout",
    ]);

    return repoPath;
  }

  async deleteRepository(repoName: string): Promise<void> {
    const repoPath = this.resolveRepoPath(repoName);
    await rm(repoPath, { recursive: true, force: true });
  }

  async hotcopy(sourceRepoPath: string, destinationPath: string): Promise<void> {
    await mkdir(destinationPath, { recursive: true });
    await this.executor.run(this.config.svnadminBin, [
      "hotcopy",
      sourceRepoPath,
      destinationPath,
    ]);
  }

  async verify(repoPath: string): Promise<string> {
    const result = await this.executor.run(this.config.svnadminBin, ["verify", repoPath]);
    return result.stdout.trim() || result.stderr.trim() || "ok";
  }

  async recover(repoPath: string): Promise<void> {
    await this.executor.run(this.config.svnadminBin, ["recover", "--wait", repoPath]);
  }

  async info(repoPath: string, pegRevision?: number): Promise<SvnRepoInfo> {
    const url = this.fileUrl(repoPath);
    const args = ["info", "--xml", url];
    if (pegRevision !== undefined) {
      args.push("-r", String(pegRevision));
    }
    const result = await this.executor.run(this.config.svnBin, args);
    return parseInfoXml(result.stdout);
  }

  async log(repoPath: string, query: SvnLogQuery = {}): Promise<SvnLogEntry[]> {
    const args = ["log", "--xml", "-v"];
    if (query.limit !== undefined) {
      args.push("-l", String(query.limit));
    }
    if (query.revision) {
      args.push("-r", query.revision);
    }
    if (query.author) {
      args.push(`--search=${query.author}`);
      args.push("--search-and");
    }
    if (query.search) {
      args.push(`--search=${query.search}`);
    }

    const url = query.path
      ? this.fileUrl(repoPath, query.path)
      : this.fileUrl(repoPath);

    args.push(url);
    const result = await this.executor.run(this.config.svnBin, args);
    const entries = parseLogXml(result.stdout);

    if (query.offset && query.offset > 0) {
      return entries.slice(query.offset);
    }

    return entries;
  }

  async logRevision(repoPath: string, revision: number): Promise<SvnLogEntry | null> {
    const entries = await this.log(repoPath, {
      revision: String(revision),
      limit: 1,
    });
    return entries[0] ?? null;
  }

  async listTree(
    repoPath: string,
    svnPath: string,
    revision?: number,
  ): Promise<SvnTreeEntry[]> {
    const url = this.fileUrl(repoPath, svnPath);
    const args = ["list", "--xml", url];
    if (revision !== undefined) {
      args.push("-r", String(revision));
    }
    const result = await this.executor.run(this.config.svnBin, args);
    return parseListXml(result.stdout, svnPath);
  }

  async cat(
    repoPath: string,
    svnPath: string,
    revision?: number,
  ): Promise<{ content: Buffer; isBinary: boolean }> {
    const url = this.fileUrl(repoPath, svnPath);
    const args = ["cat", url];
    if (revision !== undefined) {
      args.push("-r", String(revision));
    }

    try {
      const result = await this.executor.run(this.config.svnBin, args);
      return { content: Buffer.from(result.stdout, "utf8"), isBinary: false };
    } catch (error) {
      const xmlArgs = [...args.slice(0, -1), "--xml", args[args.length - 1]!];
      try {
        await this.executor.run(this.config.svnBin, xmlArgs);
      } catch {
        throw error;
      }
      const binaryResult = await this.executor.run(this.config.svnBin, [
        ...args,
        "--non-interactive",
      ]);
      return { content: Buffer.from(binaryResult.stdout, "binary"), isBinary: true };
    }
  }

  async diffRevision(
    repoPath: string,
    revision: number,
    svnPath?: string,
  ): Promise<SvnDiffFile[]> {
    const url = svnPath ? this.fileUrl(repoPath, svnPath) : this.fileUrl(repoPath);
    const previousRevision = Math.max(revision - 1, 0);
    const args = ["diff", "-r", `${previousRevision}:${revision}`, url];
    const result = await this.executor.run(this.config.svnBin, args);
    return parseUnifiedDiff(result.stdout);
  }

  async diffPaths(
    repoPath: string,
    sourcePath: string,
    targetPath: string,
    sourceRevision?: number,
    targetRevision?: number,
  ): Promise<SvnDiffFile[]> {
    const sourceUrl = this.fileUrl(repoPath, sourcePath);
    const targetUrl = this.fileUrl(repoPath, targetPath);
    const sourceRev = sourceRevision ?? "HEAD";
    const targetRev = targetRevision ?? "HEAD";

    const args = [
      "diff",
      `${sourceUrl}@${sourceRev}`,
      `${targetUrl}@${targetRev}`,
    ];
    const result = await this.executor.run(this.config.svnBin, args);
    return parseUnifiedDiff(result.stdout);
  }

  async blame(
    repoPath: string,
    svnPath: string,
    revision?: number,
  ): Promise<SvnBlameLine[]> {
    const url = this.fileUrl(repoPath, svnPath);
    const args = ["blame", "--xml", url];
    if (revision !== undefined) {
      args.push("-r", String(revision));
    }
    const result = await this.executor.run(this.config.svnBin, args);
    return parseBlameXml(result.stdout);
  }

  async exportToDirectory(
    repoPath: string,
    svnPath: string,
    targetDir: string,
    revision?: number,
  ): Promise<void> {
    const url = this.fileUrl(repoPath, svnPath);
    const args = ["export", "--force", url, targetDir];
    if (revision !== undefined) {
      args.splice(2, 0, "-r", String(revision));
    }
    await this.executor.run(this.config.svnBin, args);
  }

  async svnlookYoungest(repoPath: string): Promise<number> {
    const result = await this.executor.run(this.config.svnlookBin, [
      "youngest",
      repoPath,
    ]);
    return Number.parseInt(result.stdout.trim(), 10);
  }

  async svnlookLogEntry(
    repoPath: string,
    revision: number,
  ): Promise<SvnLogEntry | null> {
    const infoResult = await this.executor.run(this.config.svnlookBin, [
      "info",
      repoPath,
      "-r",
      String(revision),
    ]);

    const lines = infoResult.stdout.split(/\r?\n/);
    const metadata: Record<string, string> = {};
    for (const line of lines) {
      const idx = line.indexOf(":");
      if (idx === -1) continue;
      metadata[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }

    const changedResult = await this.executor.run(this.config.svnlookBin, [
      "changed",
      repoPath,
      "-r",
      String(revision),
    ]);

    const paths = changedResult.stdout
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const action = line[0] as SvnLogEntry["paths"][number]["action"];
        const changedPath = line.slice(1).trim();
        return { path: changedPath.startsWith("/") ? changedPath : `/${changedPath}`, action };
      });

    return {
      revision,
      author: metadata.Author ?? "",
      date: metadata.Date ?? new Date().toISOString(),
      message: metadata.Message ?? "",
      paths,
    };
  }

  async svnlookChangedTxn(
    repoPath: string,
    txn: string,
  ): Promise<Array<{ path: string; action: SvnLogEntry["paths"][number]["action"] }>> {
    const result = await this.executor.run(this.config.svnlookBin, [
      "changed",
      "-t",
      txn,
      repoPath,
    ]);

    return result.stdout
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const action = line[0] as SvnLogEntry["paths"][number]["action"];
        const changedPath = line.slice(1).trim();
        return { path: changedPath.startsWith("/") ? changedPath : `/${changedPath}`, action };
      });
  }

  async svnlookLogTxn(repoPath: string, txn: string): Promise<string> {
    const result = await this.executor.run(this.config.svnlookBin, [
      "log",
      "-t",
      txn,
      repoPath,
    ]);
    return result.stdout.trim();
  }

  async svnlookFileSizeTxn(
    repoPath: string,
    txn: string,
    svnPath: string,
  ): Promise<number> {
    const normalized = svnPath.startsWith("/") ? svnPath.slice(1) : svnPath;
    const result = await this.executor.run(this.config.svnlookBin, [
      "filesize",
      "-t",
      txn,
      repoPath,
      normalized,
    ]);
    return Number.parseInt(result.stdout.trim(), 10) || 0;
  }

  async copyPath(
    repoPath: string,
    sourcePath: string,
    targetPath: string,
    message: string,
    pegRevision?: number,
  ): Promise<number> {
    const sourceUrl =
      pegRevision !== undefined
        ? `${this.fileUrl(repoPath, sourcePath)}@${pegRevision}`
        : this.fileUrl(repoPath, sourcePath);
    const targetUrl = this.fileUrl(repoPath, targetPath);

    await this.executor.run(this.config.svnBin, [
      "copy",
      sourceUrl,
      targetUrl,
      "-m",
      message,
    ]);

    return (await this.info(repoPath)).revision;
  }

  async deletePath(repoPath: string, svnPath: string, message: string): Promise<number> {
    const url = this.fileUrl(repoPath, svnPath);
    await this.executor.run(this.config.svnBin, ["delete", url, "-m", message]);
    return (await this.info(repoPath)).revision;
  }

  async getPathRefInfo(
    repoPath: string,
    svnPath: string,
  ): Promise<{
    createdRevision: number;
    createdAuthor: string;
    createdDate: string;
    lastChangedRevision: number;
    lastChangedAuthor: string;
    lastChangedDate: string;
  }> {
    const url = this.fileUrl(repoPath, svnPath);
    const infoResult = await this.executor.run(this.config.svnBin, ["info", "--xml", url]);
    const info = parseInfoXml(infoResult.stdout);

    const logResult = await this.executor.run(this.config.svnBin, [
      "log",
      "--xml",
      "-l",
      "1",
      "--stop-on-copy",
      url,
    ]);
    const creation = parseLogXml(logResult.stdout)[0];

    return {
      createdRevision: creation?.revision ?? info.lastChangedRev ?? info.revision,
      createdAuthor: creation?.author ?? info.lastChangedAuthor ?? "",
      createdDate: creation?.date ?? info.lastChangedDate ?? new Date().toISOString(),
      lastChangedRevision: info.lastChangedRev ?? info.revision,
      lastChangedAuthor: info.lastChangedAuthor ?? "",
      lastChangedDate: info.lastChangedDate ?? new Date().toISOString(),
    };
  }

  async checkoutSparse(
    repoPath: string,
    targetPath: string,
    wcDir: string,
  ): Promise<void> {
    const url = this.fileUrl(repoPath, targetPath);
    await this.executor.run(this.config.svnBin, ["checkout", url, wcDir]);
  }

  async mergeWorkingCopy(
    wcDir: string,
    repoPath: string,
    sourcePath: string,
    dryRun: boolean,
  ): Promise<SvnCliRunResult> {
    const sourceUrl = this.fileUrl(repoPath, sourcePath);
    const args = ["merge", sourceUrl, wcDir, "--accept", "postpone"];
    if (dryRun) {
      args.push("--dry-run");
    }

    try {
      const result = await this.executor.run(this.config.svnBin, args, { cwd: wcDir });
      return { stdout: result.stdout, stderr: result.stderr };
    } catch (error) {
      if (error instanceof SvnCliError) {
        return { stdout: "", stderr: error.stderr };
      }
      throw error;
    }
  }

  async revertWorkingCopy(wcDir: string): Promise<void> {
    await this.executor.run(this.config.svnBin, ["revert", "-R", "."], { cwd: wcDir });
  }

  async updateWorkingCopy(wcDir: string): Promise<void> {
    await this.executor.run(this.config.svnBin, ["update", "--non-interactive"], {
      cwd: wcDir,
    });
  }

  async statusWorkingCopy(wcDir: string): Promise<string> {
    const result = await this.executor.run(this.config.svnBin, ["status"], { cwd: wcDir });
    return result.stdout;
  }

  async diffWorkingCopy(wcDir: string): Promise<string> {
    const result = await this.executor.run(this.config.svnBin, ["diff"], { cwd: wcDir });
    return result.stdout;
  }

  async commitWorkingCopy(
    wcDir: string,
    message: string,
    username: string,
  ): Promise<number> {
    await this.executor.run(
      this.config.svnBin,
      ["commit", "-m", message, "--username", username, "--non-interactive"],
      { cwd: wcDir },
    );

    const infoResult = await this.executor.run(this.config.svnBin, ["info", "--xml"], {
      cwd: wcDir,
    });
    const info = parseInfoXml(infoResult.stdout);
    return info.revision;
  }
}

export function isSvnAvailable(): boolean {
  try {
    const result = spawnSync("svn", ["--version", "--quiet"], { encoding: "utf8" });
    return result.status === 0;
  } catch {
    return false;
  }
}
