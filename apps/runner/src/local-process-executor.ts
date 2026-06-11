import { spawn } from "node:child_process";

import type { JobExecutionInput, JobExecutionResult, JobExecutor } from "./executor.js";

export class LocalProcessExecutor implements JobExecutor {
  async execute(input: JobExecutionInput): Promise<JobExecutionResult> {
    let exitCode = 0;

    for (const step of input.steps) {
      const result = await this.runStep(input, step.run);
      if (result !== 0) {
        return { exitCode: result };
      }
      exitCode = result;
    }

    return { exitCode };
  }

  private runStep(input: JobExecutionInput, command: string): Promise<number> {
    return new Promise((resolve) => {
      const shell = process.platform === "win32" ? "cmd.exe" : "/bin/sh";
      const args =
        process.platform === "win32" ? ["/d", "/s", "/c", command] : ["-c", command];

      const child = spawn(shell, args, {
        cwd: input.workdir,
        env: { ...process.env, ...input.env },
      });

      const timeout = setTimeout(() => {
        child.kill("SIGKILL");
        input.onOutput(`\n[runner] step timed out after ${input.timeoutSeconds}s\n`);
        resolve(124);
      }, input.timeoutSeconds * 1000);

      child.stdout.on("data", (chunk: Buffer) => {
        input.onOutput(chunk.toString("utf8"));
      });
      child.stderr.on("data", (chunk: Buffer) => {
        input.onOutput(chunk.toString("utf8"));
      });

      child.on("close", (code) => {
        clearTimeout(timeout);
        resolve(code ?? 1);
      });
    });
  }
}
