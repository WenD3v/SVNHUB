import { existsSync } from "node:fs";
import path from "node:path";

let cachedRoot: string | null = null;

export function getWorkspaceRoot(): string {
  if (cachedRoot) {
    return cachedRoot;
  }

  let dir = __dirname;
  while (dir !== path.dirname(dir)) {
    if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
      cachedRoot = dir;
      return dir;
    }
    dir = path.dirname(dir);
  }

  cachedRoot = path.resolve(process.cwd(), "../..");
  return cachedRoot;
}

export function resolveWorkspacePath(relativeOrAbsolute: string): string {
  if (path.isAbsolute(relativeOrAbsolute)) {
    return relativeOrAbsolute;
  }

  return path.resolve(getWorkspaceRoot(), relativeOrAbsolute);
}
