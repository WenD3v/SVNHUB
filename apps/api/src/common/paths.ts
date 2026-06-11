import path from "node:path";

export function getWorkspaceRoot(): string {
  return path.resolve(__dirname, "../../..");
}

export function resolveDataPath(relativePath: string): string {
  return path.resolve(getWorkspaceRoot(), relativePath);
}
