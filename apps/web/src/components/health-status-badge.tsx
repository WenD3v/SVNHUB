import type { HealthStatus } from "@svnhub/shared";

import { cn } from "@/lib/utils";

const HEALTH_STYLES: Record<
  HealthStatus,
  { dot: string; soft: string; text: string; label: string }
> = {
  UNKNOWN: {
    dot: "bg-muted-foreground",
    soft: "bg-muted",
    text: "text-muted-foreground",
    label: "Desconhecida",
  },
  HEALTHY: {
    dot: "bg-success",
    soft: "bg-success-soft",
    text: "text-success",
    label: "Saudável",
  },
  UNHEALTHY: {
    dot: "bg-destructive",
    soft: "bg-destructive-soft",
    text: "text-destructive",
    label: "Com problemas",
  },
  VERIFYING: {
    dot: "bg-warning",
    soft: "bg-warning-soft",
    text: "text-warning",
    label: "Verificando…",
  },
};

export function HealthStatusBadge({
  status,
  className,
}: {
  status: HealthStatus;
  className?: string;
}) {
  const style = HEALTH_STYLES[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        style.soft,
        style.text,
        className,
      )}
      title={style.label}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", style.dot)} aria-hidden />
      {style.label}
    </span>
  );
}
