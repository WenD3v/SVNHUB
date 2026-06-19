"use client";

import { PieChart } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { RepositoryAuthorDistributionResponse } from "@svnhub/shared";

interface AuthorDistributionChartProps {
  data: RepositoryAuthorDistributionResponse | null;
  loading?: boolean;
}

const HEAT_COLORS = [
  "var(--heat-4)",
  "var(--heat-3)",
  "var(--heat-2)",
  "var(--heat-1)",
  "var(--brand)",
  "var(--brand-2)",
] as const;

function CardSectionIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
      {children}
    </span>
  );
}

export function AuthorDistributionChart({ data, loading = false }: AuthorDistributionChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const authors = useMemo(() => {
    if (!data || data.total === 0) {
      return [];
    }

    return data.authors.map((author, index) => ({
      ...author,
      index,
      color: HEAT_COLORS[index % HEAT_COLORS.length],
      width: `${author.percentage}%`,
    }));
  }, [data]);

  if (loading) {
    return (
      <Card className="overflow-hidden py-0">
        <CardHeader className="flex-row items-center gap-2.5 border-b border-border bg-secondary px-4 py-3 sm:px-5">
          <CardSectionIcon>
            <PieChart className="size-3.5" aria-hidden />
          </CardSectionIcon>
          <CardTitle>Distribuição por autor</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-5 pt-4 sm:px-5">
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.total === 0 || authors.length === 0) {
    return (
      <EmptyState
        icon={PieChart}
        title="Sem contribuições"
        description="Nenhum commit indexado para calcular a distribuição por autor."
        className="py-8"
      />
    );
  }

  return (
    <Card className="overflow-hidden py-0">
      <CardHeader className="flex-row flex-wrap items-center gap-2.5 border-b border-border bg-secondary px-4 py-3 sm:px-5">
        <CardSectionIcon>
          <PieChart className="size-3.5" aria-hidden />
        </CardSectionIcon>
        <CardTitle className="flex-1">Distribuição por autor</CardTitle>
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{data.total}</span> commits
        </p>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-5 pt-4 sm:px-5">
        <TooltipProvider delayDuration={0}>
          <div
            className="flex h-3.5 overflow-hidden rounded-full"
            role="img"
            aria-label="Distribuição proporcional de commits por autor"
          >
            {authors.map((author) => (
              <Tooltip key={author.author}>
                <TooltipTrigger asChild>
                  <div
                    className="h-full transition-opacity"
                    style={{
                      width: author.width,
                      backgroundColor: author.color,
                      opacity: hoveredIndex === null || hoveredIndex === author.index ? 1 : 0.45,
                    }}
                    onMouseEnter={() => setHoveredIndex(author.index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{author.author}</p>
                  <p>
                    {author.commits} commit{author.commits === 1 ? "" : "s"} ({author.percentage}%)
                  </p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>

        <ul className="space-y-2.5">
          {authors.map((author) => (
            <li
              key={author.author}
              className="flex items-center gap-2.5 text-[12.5px]"
              onMouseEnter={() => setHoveredIndex(author.index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <span
                className="size-2.5 shrink-0 rounded-[3px]"
                style={{ backgroundColor: author.color }}
                aria-hidden
              />
              {author.hasProfile ? (
                <Link
                  href={`/users/${author.author}`}
                  className="min-w-0 flex-1 truncate font-medium text-foreground hover:text-brand hover:underline"
                >
                  {author.author}
                </Link>
              ) : (
                <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                  {author.author}
                </span>
              )}
              <span className="shrink-0 font-mono text-muted-foreground">{author.commits}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
