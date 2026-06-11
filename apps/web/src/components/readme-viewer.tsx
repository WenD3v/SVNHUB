"use client";

import { Link as LinkIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { createHighlighter, type Highlighter } from "shiki";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReadmeFormat } from "@/lib/readme";
import { cn } from "@/lib/utils";

interface ReadmeViewerProps {
  content: string;
  format?: ReadmeFormat;
  filename?: string;
  slug: string;
  branchRef: string;
  revision?: number;
}

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
      <pre className="overflow-x-auto p-4">
        <code>{code}</code>
      </pre>
    );
  }

  const safeLang = highlighter.getLoadedLanguages().includes(lang) ? lang : "text";
  const theme = isDark ? "github-dark" : "github-light";

  const html = highlighter.codeToHtml(code, { lang: safeLang, theme });

  return (
    <div className="shiki-wrapper" dangerouslySetInnerHTML={{ __html: html }} />
  );
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

  const components = useMemo<Components>(
    () => ({
      h1: ({ children }) => {
        const id = slugifyHeading(getPlainText(children));
        return (
          <h1 id={id}>
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
          <h2 id={id}>
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
          <h3 id={id}>
            {children}
            <a href={`#${id}`} className="heading-anchor" aria-label="Link para seção">
              <LinkIcon className="inline size-3.5" />
            </a>
          </h3>
        );
      },
      h4: ({ children }) => {
        const id = slugifyHeading(getPlainText(children));
        return (
          <h4 id={id}>
            {children}
            <a href={`#${id}`} className="heading-anchor" aria-label="Link para seção">
              <LinkIcon className="inline size-3.5" />
            </a>
          </h4>
        );
      },
      a: ({ href, children }) => {
        const isExternal = href?.startsWith("http");
        return (
          <a
            href={href}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noopener noreferrer" : undefined}
          >
            {children}
          </a>
        );
      },
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
    <Card>
      <CardHeader className="border-b border-border py-3">
        <CardTitle className="font-mono text-sm font-semibold">{filename}</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {format === "text" ? (
          <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-sm">{content}</pre>
        ) : (
          <article className={cn("markdown-body max-w-none")}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
              {content}
            </ReactMarkdown>
          </article>
        )}
      </CardContent>
    </Card>
  );
}
