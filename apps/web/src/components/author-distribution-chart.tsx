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

const CHART_COLORS = [
  "var(--primary)",
  "color-mix(in oklab, var(--primary) 70%, var(--background))",
  "color-mix(in oklab, var(--primary) 50%, var(--background))",
  "color-mix(in oklab, var(--success) 80%, var(--background))",
  "color-mix(in oklab, var(--success) 55%, var(--background))",
  "var(--muted-foreground)",
];

function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

export function AuthorDistributionChart({ data, loading = false }: AuthorDistributionChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const slices = useMemo(() => {
    if (!data || data.total === 0) {
      return [];
    }

    let cursor = 0;
    return data.authors.map((author, index) => {
      const angle = (author.commits / data.total) * 360;
      const slice = {
        ...author,
        index,
        startAngle: cursor,
        endAngle: cursor + angle,
        color: CHART_COLORS[index % CHART_COLORS.length],
      };
      cursor += angle;
      return slice;
    });
  }, [data]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Distribuição por autor</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.total === 0 || slices.length === 0) {
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Distribuição por autor</CardTitle>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{data.total}</span> commits
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <TooltipProvider delayDuration={0}>
          <svg viewBox="0 0 100 100" className="mx-auto h-48 w-full max-w-xs" role="img" aria-label="Gráfico de distribuição de commits por autor">
            {slices.map((slice) => (
              <Tooltip key={slice.author}>
                <TooltipTrigger asChild>
                  <path
                    d={describeArc(50, 50, 45, slice.startAngle, slice.endAngle)}
                    fill={slice.color}
                    className={hoveredIndex === slice.index ? "opacity-100" : "opacity-90"}
                    onMouseEnter={() => setHoveredIndex(slice.index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{slice.author}</p>
                  <p>
                    {slice.commits} commit{slice.commits === 1 ? "" : "s"} ({slice.percentage}%)
                  </p>
                </TooltipContent>
              </Tooltip>
            ))}
          </svg>
        </TooltipProvider>

        <ul className="space-y-2 text-sm">
          {slices.map((slice) => (
            <li key={slice.author} className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: slice.color }}
                />
                {slice.hasProfile ? (
                  <Link href={`/users/${slice.author}`} className="truncate hover:underline">
                    {slice.author}
                  </Link>
                ) : (
                  <span className="truncate">{slice.author}</span>
                )}
              </div>
              <span className="shrink-0 text-muted-foreground">{slice.percentage}%</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
