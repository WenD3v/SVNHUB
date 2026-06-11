"use client";

import { useEffect, useState } from "react";
import { createHighlighter, type Highlighter } from "shiki";

interface CodeViewerProps {
  content: string;
  language?: string;
}

export function CodeViewer({ content, language = "typescript" }: CodeViewerProps) {
  const [html, setHtml] = useState<string>("");
  const [highlighter, setHighlighter] = useState<Highlighter | null>(null);

  useEffect(() => {
    let active = true;
    void createHighlighter({
      themes: ["github-dark"],
      langs: ["typescript", "javascript", "json", "markdown", "yaml", "bash", "xml", "css", "html"],
    }).then((instance) => {
      if (active) setHighlighter(instance);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!highlighter) return;
    const safeLang = highlighter.getLoadedLanguages().includes(language) ? language : "typescript";
    setHtml(highlighter.codeToHtml(content, { lang: safeLang, theme: "github-dark" }));
  }, [content, highlighter, language]);

  if (!html) {
    return (
      <pre className="overflow-x-auto rounded-lg border border-border bg-muted/20 p-4 text-xs">
        {content}
      </pre>
    );
  }

  return (
    <div
      className="overflow-x-auto rounded-lg border border-border text-xs [&_pre]:p-4"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
