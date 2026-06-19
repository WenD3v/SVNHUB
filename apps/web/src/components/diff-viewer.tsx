"use client";

import { useTheme } from "next-themes";
import { useMemo } from "react";
import { html as diff2html } from "diff2html";
import "diff2html/bundles/css/diff2html.min.css";

import { fileAnchor } from "@/components/commit-file-list";
import { Card, CardContent } from "@/components/ui/card";
import type { SvnDiffFile } from "@svnhub/shared";

interface DiffViewerProps {
  files: SvnDiffFile[];
}

export function DiffViewer({ files }: DiffViewerProps) {
  const { resolvedTheme } = useTheme();

  const html = useMemo(() => {
    const unified = files
      .filter((file) => file.diff)
      .map((file) => {
        const header = `diff --git a/${file.path} b/${file.path}\n--- a/${file.path}\n+++ b/${file.path}\n`;
        return `${header}${file.diff}`;
      })
      .join("\n");

    if (!unified.trim()) {
      return "<p class=\"p-4 text-sm text-muted-foreground\">Nenhum diff textual disponível para esta revisão.</p>";
    }

    const rendered = diff2html(unified, {
      drawFileList: false,
      matching: "lines",
      outputFormat: "side-by-side",
      colorScheme: resolvedTheme === "dark" ? ("dark" as never) : ("light" as never),
    });

    const filesWithDiff = files.filter((file) => file.diff);
    let fileIndex = 0;
    return rendered.replace(/<div class="d2h-file-header"/g, () => {
      const file = filesWithDiff[fileIndex++];
      if (!file) {
        return '<div class="d2h-file-header"';
      }
      return `<div id="${fileAnchor(file.path)}" class="d2h-file-header scroll-mt-24"`;
    });
  }, [files, resolvedTheme]);

  if (files.filter((file) => file.diff).length === 0) {
    return (
      <Card className="overflow-hidden py-0">
        <CardContent className="p-4 text-sm text-muted-foreground">
          Nenhum diff textual disponível para esta revisão.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="p-0">
        <div
          className="diff-viewer overflow-x-auto [&_.d2h-file-wrapper]:border-b [&_.d2h-file-wrapper]:border-border [&_.d2h-file-wrapper:last-child]:border-b-0 [&_.d2h-wrapper]:text-xs"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </CardContent>
    </Card>
  );
}
