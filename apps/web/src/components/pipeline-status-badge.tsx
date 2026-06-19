import type { PipelineJobStatus, PipelineStatus, PipelineTrigger } from "@svnhub/shared";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const JOB_VARIANTS: Record<
  PipelineJobStatus,
  "brand" | "warning" | "success" | "destructive" | "muted"
> = {
  QUEUED: "brand",
  RUNNING: "warning",
  SUCCESS: "success",
  FAILURE: "destructive",
  CANCELED: "muted",
};

const PIPELINE_LABELS: Record<PipelineStatus, string> = {
  PENDING: "Pendente",
  QUEUED: "Na fila",
  RUNNING: "Rodando",
  SUCCESS: "Sucesso",
  FAILURE: "Falhou",
  CANCELED: "Cancelado",
};

const JOB_LABELS: Record<PipelineJobStatus, string> = {
  QUEUED: "Na fila",
  RUNNING: "Rodando",
  SUCCESS: "Sucesso",
  FAILURE: "Falhou",
  CANCELED: "Cancelado",
};

export function getPipelinePresentation(status: PipelineStatus): {
  dotClassName: string;
  badgeVariant: "success" | "brand" | "destructive" | "warning" | "muted";
  label: string;
  pulse: boolean;
} {
  switch (status) {
    case "SUCCESS":
      return {
        dotClassName: "bg-success",
        badgeVariant: "success",
        label: PIPELINE_LABELS.SUCCESS,
        pulse: false,
      };
    case "RUNNING":
      return {
        dotClassName: "bg-brand",
        badgeVariant: "brand",
        label: PIPELINE_LABELS.RUNNING,
        pulse: true,
      };
    case "FAILURE":
      return {
        dotClassName: "bg-destructive",
        badgeVariant: "destructive",
        label: PIPELINE_LABELS.FAILURE,
        pulse: false,
      };
    case "QUEUED":
      return {
        dotClassName: "bg-brand",
        badgeVariant: "brand",
        label: PIPELINE_LABELS.QUEUED,
        pulse: true,
      };
    case "PENDING":
      return {
        dotClassName: "bg-foreground-subtle",
        badgeVariant: "muted",
        label: PIPELINE_LABELS.PENDING,
        pulse: false,
      };
    case "CANCELED":
      return {
        dotClassName: "bg-foreground-subtle",
        badgeVariant: "muted",
        label: PIPELINE_LABELS.CANCELED,
        pulse: false,
      };
  }
}

export function formatPipelineTrigger(trigger: PipelineTrigger): string {
  switch (trigger) {
    case "PUSH":
      return "commit";
    case "PR":
      return "pull request";
    case "MANUAL":
      return "manual";
  }
}

export function PipelineStatusDot({
  status,
  className,
}: {
  status: PipelineStatus;
  className?: string;
}) {
  const presentation = getPipelinePresentation(status);

  return (
    <span
      className={cn(
        "inline-flex size-2.5 shrink-0 rounded-full",
        presentation.dotClassName,
        presentation.pulse && "animate-[svnpulse_1.2s_ease-in-out_infinite]",
        className,
      )}
      aria-hidden
    />
  );
}

export function PipelineStatusBadge({ status }: { status: PipelineStatus }) {
  const presentation = getPipelinePresentation(status);

  return (
    <Badge variant={presentation.badgeVariant} className="font-semibold">
      {presentation.label}
    </Badge>
  );
}

export function PipelineJobStatusBadge({ status }: { status: PipelineJobStatus }) {
  return (
    <Badge variant={JOB_VARIANTS[status]} className="font-semibold">
      {JOB_LABELS[status]}
    </Badge>
  );
}

export function formatDuration(durationMs: number | null): string {
  if (durationMs === null) {
    return "—";
  }
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }
  const seconds = Math.round(durationMs / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
}
