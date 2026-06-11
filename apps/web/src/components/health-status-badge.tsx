import type { HealthStatus } from "@svnhub/shared";

import { Badge } from "@/components/ui/badge";

const HEALTH_VARIANTS: Record<
  HealthStatus,
  "muted" | "success" | "destructive" | "warning"
> = {
  UNKNOWN: "muted",
  HEALTHY: "success",
  UNHEALTHY: "destructive",
  VERIFYING: "warning",
};

const HEALTH_LABELS: Record<HealthStatus, string> = {
  UNKNOWN: "Saúde desconhecida",
  HEALTHY: "Saudável",
  UNHEALTHY: "Com problemas",
  VERIFYING: "Verificando…",
};

export function HealthStatusBadge({ status }: { status: HealthStatus }) {
  return (
    <Badge variant={HEALTH_VARIANTS[status]} title={HEALTH_LABELS[status]}>
      {status}
    </Badge>
  );
}
