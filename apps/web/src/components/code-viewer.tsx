"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { createHighlighter, type Highlighter } from "shiki";

import { Card, CardContent } from "@/components/ui/card";

interface CodeViewerProps {
  content: string;
  language?: string;
}

export function CodeViewer({ content, language = "typescript" }: CodeViewerProps) {
  const { resolvedTheme } = useTheme();
  const [html, setHtml] = useState<string>("");
  const [highlighter, setHighlighter] = useState<Highlighter | null>(null);
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    let active = true;
    void createHighlighter({
      themes: ["github-light", "github-dark"],
      langs: [
        "typescript",
        "javascript",
        "json",
        "markdown",
        "yaml",
        "bash",
        "shell",
        "xml",
        "html",
        "css",
        "python",
        "java",
        "go",
        "rust",
        "sql",
        "text",
      ],
    }).then((instance) => {
      if (active) setHighlighter(instance);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!highlighter) return;
    const safeLang = highlighter.getLoadedLanguages().includes(language) ? language : "text";
    const theme = isDark ? "github-dark" : "github-light";
    setHtml(highlighter.codeToHtml(content, { lang: safeLang, theme }));
  }, [content, highlighter, language, isDark]);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {!html ? (
          <pre className="overflow-x-auto p-4 font-mono text-xs">{content}</pre>
        ) : (
          <div
            className="overflow-x-auto text-xs [&_pre]:m-0 [&_pre]:p-4"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </CardContent>
    </Card>
  );
}
