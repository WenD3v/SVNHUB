import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { LocalProcessExecutor } from "./local-process-executor.js";

describe("LocalProcessExecutor", () => {
  it("runs shell steps in workdir", async () => {
    const workdir = await mkdtemp(path.join(os.tmpdir(), "svnhub-runner-"));
    const output: string[] = [];

    try {
      const executor = new LocalProcessExecutor();
      const result = await executor.execute({
        image: "unused",
        workdir,
        steps: [{ run: process.platform === "win32" ? "echo hello" : "echo hello" }],
        env: {},
        timeoutSeconds: 30,
        onOutput: (chunk) => output.push(chunk),
      });

      expect(result.exitCode).toBe(0);
      expect(output.join("")).toContain("hello");
    } finally {
      await rm(workdir, { recursive: true, force: true });
    }
  });

  it("returns non-zero exit code on failure", async () => {
    const workdir = await mkdtemp(path.join(os.tmpdir(), "svnhub-runner-"));
    try {
      const executor = new LocalProcessExecutor();
      const command =
        process.platform === "win32" ? "exit /b 7" : "exit 7";
      const result = await executor.execute({
        image: "unused",
        workdir,
        steps: [{ run: command }],
        env: {},
        timeoutSeconds: 30,
        onOutput: () => {},
      });
      expect(result.exitCode).toBe(7);
    } finally {
      await rm(workdir, { recursive: true, force: true });
    }
  });

  it("writes files in workdir", async () => {
    const workdir = await mkdtemp(path.join(os.tmpdir(), "svnhub-runner-"));
    try {
      const executor = new LocalProcessExecutor();
      const command =
        process.platform === "win32"
          ? "echo artifact > out.txt"
          : "echo artifact > out.txt";
      await executor.execute({
        image: "unused",
        workdir,
        steps: [{ run: command }],
        env: {},
        timeoutSeconds: 30,
        onOutput: () => {},
      });
      const content = await import("node:fs/promises").then((fs) =>
        fs.readFile(path.join(workdir, "out.txt"), "utf8"),
      );
      expect(content.trim()).toBe("artifact");
    } finally {
      await rm(workdir, { recursive: true, force: true });
    }
  });
});
