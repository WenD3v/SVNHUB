"use client";

import { BarChart3 } from "lucide-react";
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
import type { RepositoryActivityResponse } from "@svnhub/shared";

interface CommitActivityChartProps {
  data: RepositoryActivityResponse | null;
  loading?: boolean;
}

function formatWeekLabel(weekStart: string): string {
  const date = new Date(weekStart);
  const end = new Date(date);
  end.setDate(end.getDate() + 6);
  const startLabel = date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
  const endLabel = end.toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" });
  return `${startLabel} – ${endLabel}`;
}

export function CommitActivityChart({ data, loading = false }: CommitActivityChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const maxCount = useMemo(
    () => Math.max(1, ...(data?.weeks.map((week) => week.count) ?? [1])),
    [data],
  );

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Atividade de commits</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.weeks.length === 0 || data.total === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Sem atividade recente"
        description="Nenhum commit indexado no período selecionado."
        className="py-8"
      />
    );
  }

  const chartHeight = 80;
  const barWidth = 100 / data.weeks.length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Atividade de commits</CardTitle>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{data.total}</span> commits no período
        </p>
      </CardHeader>
      <CardContent>
        <TooltipProvider delayDuration={0}>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="h-24 w-full"
            role="img"
            aria-label="Gráfico de commits por semana"
          >
            {data.weeks.map((week, index) => {
              const height = (week.count / maxCount) * chartHeight;
              const x = index * barWidth;
              const y = 100 - height;
              const isHovered = hoveredIndex === index;

              return (
                <Tooltip key={week.weekStart}>
                  <TooltipTrigger asChild>
                    <rect
                      x={x + barWidth * 0.15}
                      y={y}
                      width={barWidth * 0.7}
                      height={height}
                      rx={1}
                      className={
                        isHovered
                          ? "fill-primary"
                          : week.count > 0
                            ? "fill-primary/70"
                            : "fill-muted"
                      }
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{formatWeekLabel(week.weekStart)}</p>
                    <p>
                      {week.count} commit{week.count === 1 ? "" : "s"}
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
