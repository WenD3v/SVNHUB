import { spawn } from "node:child_process";
import path from "node:path";

export function buildSvnFileUrl(repoPath: string, svnPath = "/"): string {
  const posixRepoPath = repoPath.replace(/\\/g, "/");
  const normalized = svnPath.startsWith("/") ? svnPath : `/${svnPath}`;
  return `file:///${posixRepoPath.replace(/^\/+/, "")}${normalized}`;
}

export async function svnExport(
  svnBin: string,
  repoPath: string,
  svnPath: string,
  revision: number,
  targetDir: string,
): Promise<void> {
  const url = `${buildSvnFileUrl(repoPath, svnPath)}@${revision}`;
  await runCommand(svnBin, ["export", "--force", url, targetDir]);
}

async function runCommand(command: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

export async function collectArtifacts(
  workdir: string,
  patterns: string[],
): Promise<Array<{ name: string; path: string; sizeBytes: number }>> {
  if (patterns.length === 0) {
    return [];
  }

  const { glob } = await import("glob");
  const { stat } = await import("node:fs/promises");
  const files = new Set<string>();

  for (const pattern of patterns) {
    const matches = await glob(pattern, { cwd: workdir, nodir: true, absolute: true });
    for (const match of matches) {
      files.add(match);
    }
  }

  const artifacts: Array<{ name: string; path: string; sizeBytes: number }> = [];
  for (const filePath of files) {
    const fileStat = await stat(filePath);
    artifacts.push({
      name: path.relative(workdir, filePath).replace(/\\/g, "/"),
      path: filePath,
      sizeBytes: fileStat.size,
    });
  }
  return artifacts;
}
