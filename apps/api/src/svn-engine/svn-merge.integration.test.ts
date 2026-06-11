import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ConfigService } from "@nestjs/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { SvnEngineService, isSvnAvailable } from "./svn-engine.service";
import { SvnMergeService } from "./svn-merge.service";
import { WorkingCopyPoolService } from "./working-copy-pool.service";

const describeIfSvn = isSvnAvailable() ? describe : describe.skip;

describeIfSvn("SvnMergeService integration", () => {
  let tempRoot = "";
  let engine: SvnEngineService;
  let mergeService: SvnMergeService;

  beforeAll(async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "svnhub-merge-"));
    const config = new ConfigService({
      SVN_REPOS_ROOT: tempRoot,
      SVN_WC_ROOT: path.join(tempRoot, "wc-pool"),
      SVN_CLI_TIMEOUT_MS: "120000",
    });
    engine = new SvnEngineService(config);
    const wcPool = new WorkingCopyPoolService(engine, config);
    mergeService = new SvnMergeService(engine, wcPool);
  });

  afterAll(async () => {
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("previews and merges a branch into trunk", async () => {
    const repoName = "merge-repo";
    const repoPath = await engine.createRepository(repoName);
    const wcDir = path.join(tempRoot, "setup-wc");
    const { spawnSync } = await import("node:child_process");

    spawnSync("svn", ["checkout", engine.fileUrl(repoPath), wcDir], { encoding: "utf8" });
    await writeFile(path.join(wcDir, "trunk", "app.txt"), "base\n");
    spawnSync("svn", ["add", "trunk/app.txt"], { cwd: wcDir, encoding: "utf8" });
    spawnSync("svn", ["commit", "-m", "Initial trunk"], { cwd: wcDir, encoding: "utf8" });

    await engine.copyPath(repoPath, "/trunk", "/branches/feature-x", "Create branch");

    const branchWc = path.join(tempRoot, "branch-wc");
    spawnSync("svn", ["checkout", engine.fileUrl(repoPath, "/branches/feature-x"), branchWc], {
      encoding: "utf8",
    });
    await writeFile(path.join(branchWc, "app.txt"), "feature change\n");
    spawnSync("svn", ["commit", "-m", "Feature change"], { cwd: branchWc, encoding: "utf8" });

    const preview = await mergeService.previewMerge(repoPath, "/branches/feature-x", "/trunk");
    expect(preview.hasConflicts).toBe(false);
    expect(preview.files.length).toBeGreaterThan(0);

    const result = await mergeService.executeMerge(
      repoPath,
      "/branches/feature-x",
      "/trunk",
      "Merge feature-x into trunk",
      "merge-user",
    );
    expect(result.mergeRevision).toBeGreaterThan(0);

    const trunkContent = await engine.cat(repoPath, "/trunk/app.txt");
    expect(trunkContent.content.toString("utf8")).toContain("feature change");

    const mergeLog = await engine.log(repoPath, {
      path: "/trunk",
      limit: 1,
    });
    expect(mergeLog[0]?.message).toContain("Merge feature-x");
  });

  it("detects merge conflicts", async () => {
    const repoName = "conflict-repo";
    const repoPath = await engine.createRepository(repoName);
    const wcDir = path.join(tempRoot, "conflict-setup");
    const { spawnSync } = await import("node:child_process");

    spawnSync("svn", ["checkout", engine.fileUrl(repoPath), wcDir], { encoding: "utf8" });
    await writeFile(path.join(wcDir, "trunk", "shared.txt"), "base line\n");
    spawnSync("svn", ["add", "trunk/shared.txt"], { cwd: wcDir, encoding: "utf8" });
    spawnSync("svn", ["commit", "-m", "Initial"], { cwd: wcDir, encoding: "utf8" });

    await engine.copyPath(repoPath, "/trunk", "/branches/conflict-branch", "Create branch");

    const trunkWc = path.join(tempRoot, "conflict-trunk");
    spawnSync("svn", ["checkout", engine.fileUrl(repoPath, "/trunk"), trunkWc], {
      encoding: "utf8",
    });
    await writeFile(path.join(trunkWc, "shared.txt"), "trunk edit\n");
    spawnSync("svn", ["commit", "-m", "Trunk edit"], { cwd: trunkWc, encoding: "utf8" });

    const branchWc = path.join(tempRoot, "conflict-branch");
    spawnSync(
      "svn",
      ["checkout", engine.fileUrl(repoPath, "/branches/conflict-branch"), branchWc],
      { encoding: "utf8" },
    );
    await writeFile(path.join(branchWc, "shared.txt"), "branch edit\n");
    spawnSync("svn", ["commit", "-m", "Branch edit"], { cwd: branchWc, encoding: "utf8" });

    const preview = await mergeService.previewMerge(
      repoPath,
      "/branches/conflict-branch",
      "/trunk",
    );
    expect(preview.hasConflicts).toBe(true);
    expect(preview.conflictPaths.length).toBeGreaterThan(0);

    await expect(
      mergeService.executeMerge(
        repoPath,
        "/branches/conflict-branch",
        "/trunk",
        "Attempt merge",
        "merge-user",
      ),
    ).rejects.toThrow(/conflict/i);
  });
});
