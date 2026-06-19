"use client";

import { useMemo, useState } from "react";
import { Activity } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { UserHeatmapResponse } from "@svnhub/shared";

interface ContributionHeatmapProps {
  data: UserHeatmapResponse | null;
  loading?: boolean;
}

const WEEKS = 53;
const DAYS = 7;
const HEAT_LEVELS = ["var(--heat-0)", "var(--heat-1)", "var(--heat-2)", "var(--heat-3)", "var(--heat-4)"] as const;

function formatDayLabel(date: string, count: number): string {
  const formatted = new Date(date).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
  });
  return `${count} contribuiç${count === 1 ? "ão" : "ões"} em ${formatted}`;
}

function getHeatLevel(count: number, maxCount: number): (typeof HEAT_LEVELS)[number] {
  if (count <= 0) {
    return HEAT_LEVELS[0];
  }

  const ratio = count / maxCount;
  if (ratio <= 0.25) {
    return HEAT_LEVELS[1];
  }
  if (ratio <= 0.5) {
    return HEAT_LEVELS[2];
  }
  if (ratio <= 0.75) {
    return HEAT_LEVELS[3];
  }
  return HEAT_LEVELS[4];
}

function CardSectionIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
      {children}
    </span>
  );
}

export function ContributionHeatmap({ data, loading = false }: ContributionHeatmapProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const grid = useMemo(() => {
    if (!data?.days.length) {
      return [];
    }

    const countByDay = new Map(data.days.map((day) => [day.date.slice(0, 10), day.count]));
    const end = new Date(data.days[data.days.length - 1]?.date ?? new Date());
    end.setUTCHours(0, 0, 0, 0);

    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - (WEEKS * DAYS - 1));

    const weeks: Array<Array<{ key: string; date: string; count: number } | null>> = [];
    const cursor = new Date(start);

    while (cursor <= end) {
      const weekIndex = Math.floor(
        (cursor.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000),
      );
      if (!weeks[weekIndex]) {
        weeks[weekIndex] = Array.from({ length: DAYS }, () => null);
      }

      const dayIndex = cursor.getUTCDay();
      const key = cursor.toISOString().slice(0, 10);
      weeks[weekIndex][dayIndex] = {
        key,
        date: cursor.toISOString(),
        count: countByDay.get(key) ?? 0,
      };

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return weeks;
  }, [data]);

  const maxCount = useMemo(
    () => Math.max(1, ...(data?.days.map((day) => day.count) ?? [1])),
    [data],
  );

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="flex-row items-center gap-2.5 pb-3">
          <CardSectionIcon>
            <Activity className="size-3.5" aria-hidden />
          </CardSectionIcon>
          <CardTitle>Contribuições</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <Skeleton className="h-28 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.total === 0) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="flex-row items-center gap-2.5 pb-3">
          <CardSectionIcon>
            <Activity className="size-3.5" aria-hidden />
          </CardSectionIcon>
          <CardTitle>Contribuições</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <EmptyState
            icon={Activity}
            title="Sem contribuições recentes"
            description="Nenhuma revisão indexada no período selecionado."
            className="py-6"
          />
        </CardContent>
      </Card>
    );
  }

  const cellGap = 1.5;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center gap-2.5 pb-3">
        <CardSectionIcon>
          <Activity className="size-3.5" aria-hidden />
        </CardSectionIcon>
        <CardTitle>Contribuições</CardTitle>
        <p className="ml-auto text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">
            {data.total.toLocaleString("pt-BR")}
          </span>{" "}
          commits no último ano
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto px-5 pb-5">
        <TooltipProvider delayDuration={0}>
          <svg
            viewBox={`0 0 ${WEEKS * 10} ${DAYS * 10 + 10}`}
            className="h-28 w-full min-w-[640px]"
            role="img"
            aria-label="Heatmap de contribuições"
          >
            {grid.map((week, weekIndex) =>
              week.map((cell, dayIndex) => {
                if (!cell) {
                  return null;
                }

                const x = weekIndex * 10 + 1;
                const y = dayIndex * 10 + 1;
                const isHovered = hoveredKey === cell.key;
                const fill = isHovered ? HEAT_LEVELS[4] : getHeatLevel(cell.count, maxCount);

                return (
                  <Tooltip key={cell.key}>
                    <TooltipTrigger asChild>
                      <rect
                        x={x}
                        y={y}
                        width={10 - cellGap}
                        height={10 - cellGap}
                        rx={1.5}
                        fill={fill}
                        onMouseEnter={() => setHoveredKey(cell.key)}
                        onMouseLeave={() => setHoveredKey(null)}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{formatDayLabel(cell.date, cell.count)}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              }),
            )}
          </svg>
        </TooltipProvider>

        <div className="mt-3.5 flex items-center gap-1.5 text-[11px] text-foreground-subtle">
          <span>Menos</span>
          {HEAT_LEVELS.map((level, index) => (
            <span
              key={level}
              className={cn("size-[11px] rounded-[2.5px]", index === 0 && "ml-0.5")}
              style={{ backgroundColor: level }}
              aria-hidden
            />
          ))}
          <span>Mais</span>
        </div>
      </CardContent>
    </Card>
  );
}
