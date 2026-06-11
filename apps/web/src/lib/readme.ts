import type { RepositoryTreeResponse } from "@svnhub/shared";

export type ReadmeFormat = "markdown" | "text";

export interface ResolvedReadme {
  content: string;
  filename: string;
  format: ReadmeFormat;
}

export function resolveReadme(
  tree: Pick<RepositoryTreeResponse, "readme" | "readmeFilename">,
): ResolvedReadme | null {
  if (!tree.readme || !tree.readme.trim()) {
    return null;
  }
  const filename = tree.readmeFilename ?? "README.md";
  const format: ReadmeFormat = /\.(md|markdown)$/i.test(filename)
    ? "markdown"
    : "text";
  return { content: tree.readme, filename, format };
}
