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

export function MonthlyTrendChart({ data, loading = false }: MonthlyTrendChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const maxCount = useMemo(
    () => Math.max(1, ...(data?.months.map((month) => month.count) ?? [1])),
    [data],
  );

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tendência mensal</CardTitle>
        </CardHeader>
        <CardContent>
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

  const chartHeight = 80;
  const barWidth = 100 / data.months.length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Tendência mensal</CardTitle>
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
            aria-label="Gráfico de commits por mês"
          >
            {data.months.map((month, index) => {
              const height = (month.count / maxCount) * chartHeight;
              const x = index * barWidth;
              const y = 100 - height;
              const isHovered = hoveredIndex === index;

              return (
                <Tooltip key={month.monthStart}>
                  <TooltipTrigger asChild>
                    <rect
                      x={x + barWidth * 0.15}
                      y={y}
                      width={barWidth * 0.7}
                      height={height}
                      rx={1}
                      className={
                        isHovered
                          ? "fill-success"
                          : month.count > 0
                            ? "fill-success/70"
                            : "fill-muted"
                      }
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{formatMonthLabel(month.monthStart)}</p>
                    <p>
                      {month.count} commit{month.count === 1 ? "" : "s"}
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
