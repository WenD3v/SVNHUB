import type { PipelineJobStatus, PipelineStatus } from "@svnhub/shared";

const PIPELINE_COLORS: Record<PipelineStatus, string> = {
  PENDING: "bg-muted text-muted-foreground",
  QUEUED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  RUNNING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
  SUCCESS: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  FAILURE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  CANCELED: "bg-muted text-muted-foreground",
};

const JOB_COLORS: Record<PipelineJobStatus, string> = {
  QUEUED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  RUNNING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
  SUCCESS: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  FAILURE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  CANCELED: "bg-muted text-muted-foreground",
};

export function PipelineStatusBadge({ status }: { status: PipelineStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PIPELINE_COLORS[status]}`}>
      {status}
    </span>
  );
}

export function PipelineJobStatusBadge({ status }: { status: PipelineJobStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${JOB_COLORS[status]}`}>
      {status}
    </span>
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
