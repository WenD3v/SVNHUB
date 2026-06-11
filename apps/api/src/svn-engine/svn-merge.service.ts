import { Injectable } from "@nestjs/common";

import type { MergePreviewResponse } from "@svnhub/shared";

import { parseMergeOutput, parseStatusConflicts } from "./parsers/merge.parser";
import { SvnEngineService } from "./svn-engine.service";
import { WorkingCopyPoolService } from "./working-copy-pool.service";

export interface MergeExecuteResult {
  mergeRevision: number;
  changedPaths: string[];
}

@Injectable()
export class SvnMergeService {
  constructor(
    private readonly svnEngine: SvnEngineService,
    private readonly wcPool: WorkingCopyPoolService,
  ) {}

  async previewMerge(
    repoPath: string,
    sourcePath: string,
    targetPath: string,
  ): Promise<MergePreviewResponse> {
    const files = await this.svnEngine.diffPaths(repoPath, sourcePath, targetPath);

    return this.wcPool.withWorkingCopy(repoPath, targetPath, async (wcDir) => {
      const mergeOutput = await this.svnEngine.mergeWorkingCopy(
        wcDir,
        repoPath,
        sourcePath,
        true,
      );
      const parsed = parseMergeOutput(mergeOutput.stdout + "\n" + mergeOutput.stderr);

      let conflictPaths = parsed.conflictPaths;
      if (!parsed.hasConflicts) {
        const status = await this.svnEngine.statusWorkingCopy(wcDir);
        conflictPaths = parseStatusConflicts(status);
      }

      const hasConflicts = parsed.hasConflicts || conflictPaths.length > 0;

      return {
        changedPaths: parsed.changedPaths,
        conflictPaths,
        hasConflicts,
        files,
      };
    });
  }

  async executeMerge(
    repoPath: string,
    sourcePath: string,
    targetPath: string,
    message: string,
    username: string,
  ): Promise<MergeExecuteResult> {
    return this.wcPool.withWorkingCopy(repoPath, targetPath, async (wcDir) => {
      const mergeOutput = await this.svnEngine.mergeWorkingCopy(
        wcDir,
        repoPath,
        sourcePath,
        false,
      );
      const parsed = parseMergeOutput(mergeOutput.stdout + "\n" + mergeOutput.stderr);

      const status = await this.svnEngine.statusWorkingCopy(wcDir);
      const conflictPaths = [
        ...new Set([...parsed.conflictPaths, ...parseStatusConflicts(status)]),
      ];

      if (parsed.hasConflicts || conflictPaths.length > 0) {
        await this.svnEngine.revertWorkingCopy(wcDir);
        throw new Error(
          `Merge conflicts detected: ${conflictPaths.join(", ") || "unknown paths"}`,
        );
      }

      try {
        const mergeRevision = await this.svnEngine.commitWorkingCopy(
          wcDir,
          message,
          username,
        );
        return {
          mergeRevision,
          changedPaths: parsed.changedPaths,
        };
      } catch (error) {
        await this.svnEngine.revertWorkingCopy(wcDir);
        throw error;
      }
    });
  }
}
