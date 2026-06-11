import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface RepoBreadcrumbsProps {
  slug: string;
  repoName: string;
  path?: string;
  className?: string;
}

export function RepoBreadcrumbs({ slug, repoName, path, className }: RepoBreadcrumbsProps) {
  const segments = path ? path.split("/").filter(Boolean) : [];

  return (
    <nav aria-label="Breadcrumb" className={cn("flex flex-wrap items-center gap-1 text-sm", className)}>
      <Link href={`/repos/${slug}`} className="font-semibold text-primary hover:underline">
        {repoName}
      </Link>
      {segments.map((segment, index) => {
        const segmentPath = segments.slice(0, index + 1).join("/");
        const isLast = index === segments.length - 1;
        return (
          <span key={segmentPath} className="inline-flex items-center gap-1">
            <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden />
            {isLast ? (
              <span className="font-mono text-foreground">{segment}</span>
            ) : (
              <Link
                href={`/repos/${slug}/tree/${segmentPath}`}
                className="font-mono text-primary hover:underline"
              >
                {segment}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
