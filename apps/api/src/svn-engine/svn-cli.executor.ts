import { spawn } from "node:child_process";

export class SvnCliError extends Error {
  constructor(
    message: string,
    readonly command: string,
    readonly exitCode: number | null,
    readonly stderr: string,
  ) {
    super(message);
    this.name = "SvnCliError";
  }
}

export interface SvnCliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface SvnCliExecutorOptions {
  timeoutMs?: number;
  cwd?: string;
}

/** Reject null bytes, newlines and shell chaining — spawn uses argv arrays (no shell). */
const UNSAFE_ARG_PATTERN = /[\0\r\n;|`$]|&&|\|\|/;

export function sanitizeCliArg(arg: string): string {
  if (typeof arg !== "string" || arg.length === 0) {
    throw new Error("SVN CLI argument must be a non-empty string");
  }
  if (UNSAFE_ARG_PATTERN.test(arg)) {
    throw new Error(`Unsafe SVN CLI argument rejected: ${arg}`);
  }
  return arg;
}

export function sanitizeCliArgs(args: string[]): string[] {
  return args.map(sanitizeCliArg);
}

export class SvnCliExecutor {
  constructor(private readonly defaultTimeoutMs = 120_000) {}

  async run(
    binary: string,
    args: string[],
    options: SvnCliExecutorOptions = {},
  ): Promise<SvnCliResult> {
    const safeArgs = sanitizeCliArgs(args);
    const timeoutMs = options.timeoutMs ?? this.defaultTimeoutMs;

    return new Promise((resolve, reject) => {
      const child = spawn(binary, safeArgs, {
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
        cwd: options.cwd,
      });

      let stdout = "";
      let stderr = "";
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");
      }, timeoutMs);

      child.stdout?.on("data", (chunk: Buffer) => {
        stdout += chunk.toString("utf8");
      });

      child.stderr?.on("data", (chunk: Buffer) => {
        stderr += chunk.toString("utf8");
      });

      child.on("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });

      child.on("close", (code) => {
        clearTimeout(timer);
        const exitCode = code ?? 1;

        if (timedOut) {
          reject(
            new SvnCliError(
              `SVN command timed out after ${timeoutMs}ms`,
              `${binary} ${safeArgs.join(" ")}`,
              exitCode,
              stderr,
            ),
          );
          return;
        }

        if (exitCode !== 0) {
          reject(
            new SvnCliError(
              stderr.trim() || `SVN command failed with exit code ${exitCode}`,
              `${binary} ${safeArgs.join(" ")}`,
              exitCode,
              stderr,
            ),
          );
          return;
        }

        resolve({ stdout, stderr, exitCode });
      });
    });
  }
}
