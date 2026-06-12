import { spawnSync } from "node:child_process";
import { chmod } from "node:fs/promises";

function resolveSvnApacheIds(): { uid: number; gid: number } {
  return {
    uid: Number(process.env.SVN_REPO_UID ?? 33),
    gid: Number(process.env.SVN_REPO_GID ?? 33),
  };
}

function canFixApacheOwnership(): boolean {
  return typeof process.getuid === "function" && process.getuid() === 0;
}

export function ensureApacheRepoOwnership(repoPath: string): void {
  if (!canFixApacheOwnership()) {
    return;
  }

  const { uid, gid } = resolveSvnApacheIds();
  const result = spawnSync("chown", ["-R", `${uid}:${gid}`, repoPath], {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    console.warn(
      `[svn] Failed to chown SVN repo for Apache (${repoPath}): ${result.stderr || result.stdout}`,
    );
  }
}

export async function ensureApacheSvnFileOwnership(filePath: string): Promise<void> {
  if (!canFixApacheOwnership()) {
    return;
  }

  const { uid, gid } = resolveSvnApacheIds();
  const result = spawnSync("chown", [`${uid}:${gid}`, filePath], {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    console.warn(
      `[svn] Failed to chown SVN config file (${filePath}): ${result.stderr || result.stdout}`,
    );
    return;
  }

  await chmod(filePath, 0o640);
}
