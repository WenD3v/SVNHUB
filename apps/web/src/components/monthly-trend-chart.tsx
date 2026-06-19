"use client";

import { TrendingUp } from "lucide-react";
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
import type { RepositoryMonthlyActivityResponse } from "@svnhub/shared";

interface MonthlyTrendChartProps {
  data: RepositoryMonthlyActivityResponse | null;
  loading?: boolean;
}

function formatMonthLabel(monthStart: string): string {
  return new Date(monthStart).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function CardSectionIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
      {children}
    </span>
  );
}

export function MonthlyTrendChart({ data, loading = false }: MonthlyTrendChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const maxCount = useMemo(
    () => Math.max(1, ...(data?.months.map((month) => month.count) ?? [1])),
    [data],
  );

  const chartPoints = useMemo(() => {
    if (!data?.months.length) {
      return { line: "", area: "" };
    }

    const chartHeight = 80;
    const topPadding = 10;
    const points = data.months.map((month, index) => {
      const x = data.months.length === 1 ? 50 : (index / (data.months.length - 1)) * 100;
      const y = topPadding + chartHeight - (month.count / maxCount) * chartHeight;
      return { x, y, month, index };
    });

    const line = points.map((point) => `${point.x},${point.y}`).join(" ");
    const area = `${points.map((point) => `${point.x},${point.y}`).join(" ")} 100,${topPadding + chartHeight} 0,${topPadding + chartHeight}`;

    return { line, area, points };
  }, [data, maxCount]);

  if (loading) {
    return (
      <Card className="overflow-hidden py-0">
        <CardHeader className="flex-row items-center gap-2.5 border-b border-border bg-secondary px-4 py-3 sm:px-5">
          <CardSectionIcon>
            <TrendingUp className="size-3.5" aria-hidden />
          </CardSectionIcon>
          <CardTitle>Tendência mensal</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-5 pt-4 sm:px-5">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.months.length === 0 || data.total === 0) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="Sem tendência mensal"
        description="Nenhum commit indexado no período selecionado."
        className="py-8"
      />
    );
  }

  return (
    <Card className="overflow-hidden py-0">
      <CardHeader className="flex-row flex-wrap items-center gap-2.5 border-b border-border bg-secondary px-4 py-3 sm:px-5">
        <CardSectionIcon>
          <TrendingUp className="size-3.5" aria-hidden />
        </CardSectionIcon>
        <div className="min-w-0 flex-1">
          <CardTitle>Tendência mensal</CardTitle>
          <p className="text-xs text-muted-foreground">Commits por mês · 12 meses</p>
        </div>
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{data.total}</span> commits no período
        </p>
      </CardHeader>
      <CardContent className="px-4 pb-5 pt-4 sm:px-5">
        <TooltipProvider delayDuration={0}>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="h-[90px] w-full overflow-visible"
            role="img"
            aria-label="Gráfico de commits por mês"
          >
            <line
              x1="0"
              y1="90"
              x2="100"
              y2="90"
              stroke="var(--border)"
              strokeWidth="0.5"
              vectorEffect="non-scaling-stroke"
            />
            {chartPoints.area ? (
              <polygon
                points={chartPoints.area}
                fill="color-mix(in oklab, var(--brand) 15%, transparent)"
              />
            ) : null}
            {chartPoints.line ? (
              <polyline
                points={chartPoints.line}
                fill="none"
                stroke="var(--brand)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
            {chartPoints.points?.map((point) => {
              const isHovered = hoveredIndex === point.index;

              return (
                <Tooltip key={point.month.monthStart}>
                  <TooltipTrigger asChild>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={isHovered ? 2.5 : 1.75}
                      fill="var(--brand)"
                      stroke="var(--card)"
                      strokeWidth="0.75"
                      vectorEffect="non-scaling-stroke"
                      onMouseEnter={() => setHoveredIndex(point.index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{formatMonthLabel(point.month.monthStart)}</p>
                    <p>
                      {point.month.count} commit{point.month.count === 1 ? "" : "s"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </svg>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
