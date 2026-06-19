"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { createHighlighter, type Highlighter } from "shiki";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CodeViewerProps {
  content: string;
  language?: string;
  path?: string;
  className?: string;
}

export function CodeViewer({ content, language = "typescript", path, className }: CodeViewerProps) {
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
    <Card className={cn("overflow-hidden py-0", className)}>
      {path ? (
        <div className="border-b border-border bg-secondary px-4 py-2.5 font-mono text-xs text-muted-foreground sm:px-5">
          {path}
        </div>
      ) : null}
      <CardContent className="p-0">
        {!html ? (
          <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-foreground">
            {content}
          </pre>
        ) : (
          <div
            className={cn(
              "code-viewer overflow-x-auto text-xs leading-relaxed",
              "[&_pre]:m-0 [&_pre]:bg-transparent [&_pre]:p-4",
              "[&_.line]:opacity-100",
            )}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </CardContent>
    </Card>
  );
}
