"use client";

import { FilePen, FilePlus, FileX, RefreshCw, Tag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SvnChangeAction, SvnDiffFile } from "@svnhub/shared";

interface CommitFileListProps {
  files: SvnDiffFile[];
}

const ACTION_VARIANT: Record<
  SvnChangeAction,
  "success" | "warning" | "destructive" | "secondary" | "muted"
> = {
  A: "success",
  M: "warning",
  D: "destructive",
  R: "secondary",
  T: "muted",
};

const ACTION_ICON: Record<SvnChangeAction, typeof FilePlus> = {
  A: FilePlus,
  M: FilePen,
  D: FileX,
  R: RefreshCw,
  T: Tag,
};

function fileAnchor(path: string): string {
  return `file-${path.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function countDiffLines(diff?: string): { added: number; removed: number } {
  if (!diff) {
    return { added: 0, removed: 0 };
  }

  let added = 0;
  let removed = 0;

  for (const line of diff.split("\n")) {
    if (line.startsWith("+") && !line.startsWith("+++")) {
      added += 1;
    }
    if (line.startsWith("-") && !line.startsWith("---")) {
      removed += 1;
    }
  }

  return { added, removed };
}

export function CommitFileList({ files }: CommitFileListProps) {
  if (files.length === 0) {
    return null;
  }

  return (
    <Card className="overflow-hidden py-0">
      <CardHeader className="border-b border-border bg-secondary px-4 py-3 sm:px-5">
        <CardTitle className="text-sm">
          {files.length} arquivo{files.length === 1 ? "" : "s"} alterado
          {files.length === 1 ? "" : "s"}
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-border p-0">
        {files.map((file) => {
          const Icon = ACTION_ICON[file.action];
          const { added, removed } = countDiffLines(file.diff);

          return (
            <a
              key={file.path}
              href={`#${fileAnchor(file.path)}`}
              className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-accent/50 sm:px-5"
            >
              <Badge
                variant={ACTION_VARIANT[file.action]}
                className="size-7 shrink-0 justify-center rounded-md p-0"
              >
                <Icon className="size-3.5" aria-hidden />
                <span className="sr-only">{file.action}</span>
              </Badge>
              <span className="min-w-0 flex-1 truncate font-mono text-foreground">{file.path}</span>
              {(added > 0 || removed > 0) && (
                <span className="shrink-0 font-mono text-xs">
                  {added > 0 ? (
                    <span className="text-success">+{added}</span>
                  ) : null}
                  {added > 0 && removed > 0 ? " " : null}
                  {removed > 0 ? (
                    <span className="text-destructive">−{removed}</span>
                  ) : null}
                </span>
              )}
            </a>
          );
        })}
      </CardContent>
    </Card>
  );
}

export { fileAnchor };
