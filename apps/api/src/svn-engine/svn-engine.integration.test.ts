import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ConfigService } from "@nestjs/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { SvnEngineService, isSvnAvailable } from "./svn-engine.service";

const describeIfSvn = isSvnAvailable() ? describe : describe.skip;

describeIfSvn("SvnEngineService integration", () => {
  let tempRoot = "";
  let engine: SvnEngineService;

  beforeAll(async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "svnhub-engine-"));
    const config = new ConfigService({
      SVN_REPOS_ROOT: tempRoot,
      SVN_CLI_TIMEOUT_MS: "120000",
    });
    engine = new SvnEngineService(config);
  });

  afterAll(async () => {
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("creates repository with standard layout and reads tree/log", async () => {
    const repoName = "demo-repo";
    const repoPath = await engine.createRepository(repoName);
    expect(repoPath).toContain(`${repoName}.svn`);

    const info = await engine.info(repoPath);
    expect(info.revision).toBeGreaterThanOrEqual(1);

    const trunkEntries = await engine.listTree(repoPath, "/trunk", info.revision);
    expect(trunkEntries.length).toBeGreaterThanOrEqual(0);

    const logEntries = await engine.log(repoPath, { limit: 5 });
    expect(logEntries.length).toBeGreaterThan(0);
    expect(logEntries[0]?.message).toContain("layout");
  });

  it("imports a file and returns cat/blame/diff", async () => {
    const repoName = "content-repo";
    const repoPath = await engine.createRepository(repoName);
    const wcDir = path.join(tempRoot, "wc-content");
    const { spawnSync } = await import("node:child_process");

    spawnSync("svn", ["checkout", engine.fileUrl(repoPath), wcDir], { encoding: "utf8" });
    await writeFile(path.join(wcDir, "trunk", "README.md"), "# Hello SVNHUB\n");
    spawnSync("svn", ["add", "trunk/README.md"], { cwd: wcDir, encoding: "utf8" });
    spawnSync("svn", ["commit", "-m", "Add readme"], { cwd: wcDir, encoding: "utf8" });

    const info = await engine.info(repoPath);
    const { content } = await engine.cat(repoPath, "/trunk/README.md", info.revision);
    expect(content.toString("utf8")).toContain("Hello SVNHUB");

    const blame = await engine.blame(repoPath, "/trunk/README.md", info.revision);
    expect(blame.length).toBeGreaterThan(0);

    const diff = await engine.diffRevision(repoPath, info.revision, "/trunk");
    expect(diff.length).toBeGreaterThan(0);
  });

  it("copies and deletes a branch", async () => {
    const repoName = "branch-repo";
    const repoPath = await engine.createRepository(repoName);
    const wcDir = path.join(tempRoot, "wc-branch");
    const { spawnSync } = await import("node:child_process");

    spawnSync("svn", ["checkout", engine.fileUrl(repoPath), wcDir], { encoding: "utf8" });
    await writeFile(path.join(wcDir, "trunk", "app.txt"), "v1\n");
    spawnSync("svn", ["add", "trunk/app.txt"], { cwd: wcDir, encoding: "utf8" });
    spawnSync("svn", ["commit", "-m", "Initial app"], { cwd: wcDir, encoding: "utf8" });

    await engine.copyPath(
      repoPath,
      "/trunk",
      "/branches/feature-x",
      "Create branch feature-x",
    );

    const branchEntries = await engine.listTree(repoPath, "/branches/feature-x");
    expect(branchEntries.some((e) => e.name === "app.txt")).toBe(true);

    await engine.deletePath(repoPath, "/branches/feature-x", "Delete branch feature-x");

    await expect(engine.listTree(repoPath, "/branches/feature-x")).rejects.toThrow();
  });
});

describe("isSvnAvailable", () => {
  it("returns boolean", () => {
    expect(typeof isSvnAvailable()).toBe("boolean");
  });
});
