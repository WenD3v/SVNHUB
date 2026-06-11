"use client";

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
import type { UserHeatmapResponse } from "@svnhub/shared";
import { CalendarDays } from "lucide-react";

interface ContributionHeatmapProps {
  data: UserHeatmapResponse | null;
  loading?: boolean;
}

const WEEKS = 53;
const DAYS = 7;

function formatDayLabel(date: string, count: number): string {
  const formatted = new Date(date).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
  });
  return `${count} contribuiç${count === 1 ? "ão" : "ões"} em ${formatted}`;
}

function getIntensityClass(count: number, maxCount: number): string {
  if (count <= 0) {
    return "fill-muted";
  }

  const ratio = count / maxCount;
  if (ratio <= 0.25) {
    return "fill-success/25";
  }
  if (ratio <= 0.5) {
    return "fill-success/45";
  }
  if (ratio <= 0.75) {
    return "fill-success/70";
  }
  return "fill-success";
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
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Contribuições</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-28 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.total === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Sem contribuições recentes"
        description="Nenhuma revisão indexada no período selecionado."
        className="py-8"
      />
    );
  }

  const cellSize = 100 / WEEKS;
  const cellGap = cellSize * 0.15;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Contribuições</CardTitle>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{data.total}</span> contribuições no
          período
        </p>
      </CardHeader>
      <CardContent>
        <TooltipProvider delayDuration={0}>
          <svg
            viewBox={`0 0 ${WEEKS * 10} ${DAYS * 10 + 10}`}
            className="h-28 w-full"
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

                return (
                  <Tooltip key={cell.key}>
                    <TooltipTrigger asChild>
                      <rect
                        x={x}
                        y={y}
                        width={10 - cellGap}
                        height={10 - cellGap}
                        rx={1.5}
                        className={
                          isHovered
                            ? "fill-success"
                            : getIntensityClass(cell.count, maxCount)
                        }
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
      </CardContent>
    </Card>
  );
}
