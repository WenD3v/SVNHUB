import type { PipelineJobStatus, PipelineStatus } from "@svnhub/shared";

import { Badge } from "@/components/ui/badge";

const PIPELINE_VARIANTS: Record<
  PipelineStatus,
  "muted" | "default" | "warning" | "success" | "destructive"
> = {
  PENDING: "muted",
  QUEUED: "default",
  RUNNING: "warning",
  SUCCESS: "success",
  FAILURE: "destructive",
  CANCELED: "muted",
};

const JOB_VARIANTS: Record<
  PipelineJobStatus,
  "default" | "warning" | "success" | "destructive" | "muted"
> = {
  QUEUED: "default",
  RUNNING: "warning",
  SUCCESS: "success",
  FAILURE: "destructive",
  CANCELED: "muted",
};

export function PipelineStatusBadge({ status }: { status: PipelineStatus }) {
  return <Badge variant={PIPELINE_VARIANTS[status]}>{status}</Badge>;
}

export function PipelineJobStatusBadge({ status }: { status: PipelineJobStatus }) {
  return <Badge variant={JOB_VARIANTS[status]}>{status}</Badge>;
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
