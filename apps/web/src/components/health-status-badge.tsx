import type { HealthStatus } from "@svnhub/shared";

const HEALTH_COLORS: Record<HealthStatus, string> = {
  UNKNOWN: "bg-muted text-muted-foreground",
  HEALTHY: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  UNHEALTHY: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  VERIFYING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
};

const HEALTH_LABELS: Record<HealthStatus, string> = {
  UNKNOWN: "Saúde desconhecida",
  HEALTHY: "Saudável",
  UNHEALTHY: "Com problemas",
  VERIFYING: "Verificando…",
};

export function HealthStatusBadge({ status }: { status: HealthStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${HEALTH_COLORS[status]}`}
      title={HEALTH_LABELS[status]}
    >
      {status}
    </span>
  );
}
