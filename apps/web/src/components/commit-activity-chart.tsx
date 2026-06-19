"use client";

import { BarChart3 } from "lucide-react";
import { useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
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
  const endLabel = end.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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
      <Card className="py-0">
        <CardContent className="p-4 sm:p-5">
          <Skeleton className="mb-3.5 h-5 w-48" />
          <Skeleton className="h-[60px] w-full" />
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

  const chartHeight = 60;

  return (
    <Card className="py-0">
      <CardContent className="p-4 sm:p-5">
        <div className="mb-3.5 flex items-center gap-2.5">
          <h3 className="font-display text-sm font-semibold text-foreground">
            Atividade de commits
          </h3>
          <span className="text-xs text-muted-foreground">52 semanas</span>
        </div>
        <TooltipProvider delayDuration={0}>
          <div
            className="flex h-[60px] items-end gap-[3px]"
            role="img"
            aria-label="Gráfico de commits por semana"
          >
            {data.weeks.map((week, index) => {
              const height = Math.max(2, (week.count / maxCount) * chartHeight);
              const isHovered = hoveredIndex === index;

              return (
                <Tooltip key={week.weekStart}>
                  <TooltipTrigger asChild>
                    <div
                      className="min-w-[3px] flex-1 rounded-t-sm bg-brand transition-opacity"
                      style={{
                        height: `${height}px`,
                        opacity: isHovered ? 1 : week.count > 0 ? 0.85 : 0.25,
                      }}
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
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
