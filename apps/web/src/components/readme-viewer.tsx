"use client";

import { BookOpen } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import { type Components } from "react-markdown";
import { createHighlighter, type Highlighter } from "shiki";

import { MarkdownContent } from "@/components/markdown-content";
import { Card, CardContent } from "@/components/ui/card";
import type { ReadmeFormat } from "@/lib/readme";

interface ReadmeViewerProps {
  content: string;
  format?: ReadmeFormat;
  filename?: string;
  slug: string;
  branchRef: string;
  revision?: number;
}

export function ReadmeViewer({
  content,
  format = "markdown",
  filename = "README.md",
  slug,
  branchRef,
  revision,
}: ReadmeViewerProps) {
  const { resolvedTheme } = useTheme();
  const [highlighter, setHighlighter] = useState<Highlighter | null>(null);
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    let active = true;
    void createHighlighter({
      themes: ["github-light", "github-dark"],
      langs: [
        "text",
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
        "diff",
      ],
    }).then((instance) => {
      if (active) setHighlighter(instance);
    });
    return () => {
      active = false;
    };
  }, []);

  const readmeComponents = useMemo<Components>(
    () => ({
      img: ({ src, alt }) => {
        const srcString = typeof src === "string" ? src : undefined;
        const resolved = resolveImageUrl(srcString, slug, branchRef, revision);
        if (!resolved) return null;
        // README images are served dynamically from the SVN content API.
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={resolved} alt={alt ?? ""} loading="lazy" />;
      },
      pre: ({ children }) => {
        const child = children as React.ReactElement<{
          className?: string;
          children?: React.ReactNode;
        }>;
        return (
          <CodeBlock
            className={child?.props?.className}
            highlighter={highlighter}
            isDark={isDark}
          >
            {child?.props?.children}
          </CodeBlock>
        );
      },
    }),
    [highlighter, isDark, slug, branchRef, revision],
  );

  return (
    <Card className="overflow-hidden py-0">
      <div className="flex items-center gap-2 border-b border-border bg-secondary px-4 py-2.5 sm:px-5">
        <BookOpen className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="font-mono text-xs font-semibold text-foreground">{filename}</span>
      </div>
      <CardContent className="px-5 py-5 sm:px-6 sm:py-6">
        {format === "text" ? (
          <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-sm text-foreground">
            {content}
          </pre>
        ) : (
          <MarkdownContent
            content={content}
            slug={slug}
            className="readme-markdown"
            extraComponents={readmeComponents}
          />
        )}
      </CardContent>
    </Card>
  );
}

function resolveImageUrl(
  src: string | undefined,
  slug: string,
  ref: string,
  revision?: number,
): string | undefined {
  if (!src) return undefined;
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:")) {
    return src;
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const normalized = src.replace(/^\.\//, "");
  const revisionQuery = revision ? `&revision=${revision}` : "";
  return `${baseUrl}/repositories/${slug}/content?ref=${encodeURIComponent(ref)}&path=${encodeURIComponent(normalized)}${revisionQuery}`;
}

function CodeBlock({
  className,
  children,
  highlighter,
  isDark,
}: {
  className?: string;
  children: React.ReactNode;
  highlighter: Highlighter | null;
  isDark: boolean;
}) {
  const match = /language-(\w+)/.exec(className ?? "");
  const code = String(children).replace(/\n$/, "");
  const lang = match?.[1] ?? "text";

  if (!highlighter) {
    return (
      <pre className="overflow-x-auto rounded-md border border-border bg-secondary p-4">
        <code className="font-mono text-xs">{code}</code>
      </pre>
    );
  }

  const safeLang = highlighter.getLoadedLanguages().includes(lang) ? lang : "text";
  const theme = isDark ? "github-dark" : "github-light";
  const html = highlighter.codeToHtml(code, { lang: safeLang, theme });

  return (
    <div
      className="shiki-wrapper overflow-x-auto rounded-md border border-border bg-secondary"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
