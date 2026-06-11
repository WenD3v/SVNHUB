import { apiFetch } from "@/lib/api";
import type { RepositoryFileContentResponse } from "@svnhub/shared";

export type ReadmeFormat = "markdown" | "text";

export interface ResolvedReadme {
  content: string;
  filename: string;
  format: ReadmeFormat;
}

const README_CANDIDATES: Array<{ filename: string; format: ReadmeFormat }> = [
  { filename: "README.md", format: "markdown" },
  { filename: "readme.md", format: "markdown" },
  { filename: "Readme.md", format: "markdown" },
  { filename: "README.markdown", format: "markdown" },
  { filename: "README.txt", format: "text" },
  { filename: "README", format: "text" },
];

export async function resolveReadme(
  slug: string,
  ref: string,
  revision: number | undefined,
  existing: string | null,
): Promise<ResolvedReadme | null> {
  if (existing) {
    return { content: existing, filename: "README.md", format: "markdown" };
  }

  for (const candidate of README_CANDIDATES) {
    try {
      const revisionQuery = revision ? `&revision=${revision}` : "";
      const file = await apiFetch<RepositoryFileContentResponse>(
        `/repositories/${slug}/content?ref=${encodeURIComponent(ref)}&path=${encodeURIComponent(candidate.filename)}${revisionQuery}`,
      );
      if (!file.isBinary && file.content.trim()) {
        return {
          content: file.content,
          filename: candidate.filename,
          format: candidate.format,
        };
      }
    } catch {
      // try next candidate
    }
  }

  return null;
}
