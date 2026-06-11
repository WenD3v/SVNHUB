"use client";

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

function fileAnchor(path: string): string {
  return `file-${path.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

export function CommitFileList({ files }: CommitFileListProps) {
  if (files.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {files.length} arquivo{files.length === 1 ? "" : "s"} alterado
          {files.length === 1 ? "" : "s"}
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-border p-0">
        {files.map((file) => (
          <a
            key={file.path}
            href={`#${fileAnchor(file.path)}`}
            className="flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-muted/50"
          >
            <Badge variant={ACTION_VARIANT[file.action]} className="w-6 justify-center font-mono">
              {file.action}
            </Badge>
            <span className="truncate font-mono text-foreground">{file.path}</span>
          </a>
        ))}
      </CardContent>
    </Card>
  );
}

export { fileAnchor };
