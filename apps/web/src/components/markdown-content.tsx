"use client";

import { Link as LinkIcon } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { createHighlighter, type Highlighter } from "shiki";

import { cn } from "@/lib/utils";

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function getPlainText(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(getPlainText).join("");
  if (children && typeof children === "object" && "props" in children) {
    return getPlainText((children as React.ReactElement<{ children?: React.ReactNode }>).props.children);
  }
  return "";
}

export function autolinkReferences(content: string, slug: string): string {
  return content
    .replace(
      /(^|[\s(])#(\d+)(?=[\s),.:;!?]|$)/g,
      (_, prefix: string, number: string) =>
        `${prefix}[#${number}](/repos/${slug}/issues/${number})`,
    )
    .replace(
      /(^|[\s(])r(\d+)(?=[\s),.:;!?]|$)/gi,
      (_, prefix: string, revision: string) =>
        `${prefix}[r${revision}](/repos/${slug}/commits/${revision})`,
    );
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

interface MarkdownContentProps {
  content: string;
  slug: string;
  className?: string;
  extraComponents?: Components;
}

export function MarkdownContent({
  content,
  slug,
  className,
  extraComponents,
}: MarkdownContentProps) {
  const { resolvedTheme } = useTheme();
  const [highlighter, setHighlighter] = useState<Highlighter | null>(null);
  const isDark = resolvedTheme === "dark";
  const processedContent = useMemo(
    () => autolinkReferences(content, slug),
    [content, slug],
  );

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

  const components = useMemo<Components>(
    () => ({
      h1: ({ children }) => {
        const id = slugifyHeading(getPlainText(children));
        return (
          <h1 id={id} className="font-display text-2xl font-bold tracking-tight">
            {children}
            <a href={`#${id}`} className="heading-anchor" aria-label="Link para seção">
              <LinkIcon className="inline size-3.5" />
            </a>
          </h1>
        );
      },
      h2: ({ children }) => {
        const id = slugifyHeading(getPlainText(children));
        return (
          <h2 id={id} className="font-display text-lg font-semibold tracking-tight">
            {children}
            <a href={`#${id}`} className="heading-anchor" aria-label="Link para seção">
              <LinkIcon className="inline size-3.5" />
            </a>
          </h2>
        );
      },
      h3: ({ children }) => {
        const id = slugifyHeading(getPlainText(children));
        return (
          <h3 id={id} className="font-display text-base font-semibold">
            {children}
            <a href={`#${id}`} className="heading-anchor" aria-label="Link para seção">
              <LinkIcon className="inline size-3.5" />
            </a>
          </h3>
        );
      },
      a: ({ href, children }) => {
        const isExternal = href?.startsWith("http");
        if (isExternal) {
          return (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          );
        }
        if (href?.startsWith("/")) {
          return (
            <Link href={href} className="text-brand hover:underline">
              {children}
            </Link>
          );
        }
        return <a href={href}>{children}</a>;
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
      code: ({ className, children }) => {
        const isBlock = className?.includes("language-");
        if (isBlock) {
          return <code className={className}>{children}</code>;
        }
        return (
          <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[0.85em]">
            {children}
          </code>
        );
      },
      ...extraComponents,
    }),
    [highlighter, isDark, extraComponents],
  );

  return (
    <article className={cn("markdown-body max-w-none", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {processedContent}
      </ReactMarkdown>
    </article>
  );
}
