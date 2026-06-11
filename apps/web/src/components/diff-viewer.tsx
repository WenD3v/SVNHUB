"use client";

import { useMemo } from "react";
import { html as diff2html } from "diff2html";
import "diff2html/bundles/css/diff2html.min.css";

import type { SvnDiffFile } from "@svnhub/shared";

interface DiffViewerProps {
  files: SvnDiffFile[];
}

export function DiffViewer({ files }: DiffViewerProps) {
  const html = useMemo(() => {
    const unified = files
      .filter((file) => file.diff)
      .map((file) => file.diff)
      .join("\n");

    if (!unified.trim()) {
      return "<p>Nenhum diff textual disponível para esta revisão.</p>";
    }

    return diff2html(unified, {
      drawFileList: true,
      matching: "lines",
      outputFormat: "side-by-side",
    });
  }, [files]);

  return (
    <div
      className="diff-viewer overflow-x-auto rounded-lg border border-border"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
