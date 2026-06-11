import type { PipelineJobStatus, PipelineStatus } from "./pipelines.js";

const TERMINAL_PIPELINE_STATUSES: ReadonlySet<PipelineStatus> = new Set([
  "SUCCESS",
  "FAILURE",
  "CANCELED",
]);

const TERMINAL_JOB_STATUSES: ReadonlySet<PipelineJobStatus> = new Set([
  "SUCCESS",
  "FAILURE",
  "CANCELED",
]);

export function isTerminalPipelineStatus(status: PipelineStatus): boolean {
  return TERMINAL_PIPELINE_STATUSES.has(status);
}

export function isTerminalJobStatus(status: PipelineJobStatus): boolean {
  return TERMINAL_JOB_STATUSES.has(status);
}

export function canTransitionPipeline(
  from: PipelineStatus,
  to: PipelineStatus,
): boolean {
  if (from === to) {
    return true;
  }
  if (isTerminalPipelineStatus(from)) {
    return false;
  }

  const allowed: Record<PipelineStatus, PipelineStatus[]> = {
    PENDING: ["QUEUED", "CANCELED"],
    QUEUED: ["RUNNING", "CANCELED"],
    RUNNING: ["SUCCESS", "FAILURE", "CANCELED"],
    SUCCESS: [],
    FAILURE: [],
    CANCELED: [],
  };

  return allowed[from].includes(to);
}

export function canTransitionJob(
  from: PipelineJobStatus,
  to: PipelineJobStatus,
): boolean {
  if (from === to) {
    return true;
  }
  if (isTerminalJobStatus(from)) {
    return false;
  }

  const allowed: Record<PipelineJobStatus, PipelineJobStatus[]> = {
    QUEUED: ["RUNNING", "CANCELED"],
    RUNNING: ["SUCCESS", "FAILURE", "CANCELED"],
    SUCCESS: [],
    FAILURE: [],
    CANCELED: [],
  };

  return allowed[from].includes(to);
}

export function aggregatePipelineStatus(
  jobStatuses: PipelineJobStatus[],
  pipelineStatus: PipelineStatus,
): PipelineStatus {
  if (pipelineStatus === "CANCELED") {
    return "CANCELED";
  }
  if (jobStatuses.length === 0) {
    return pipelineStatus;
  }
  if (jobStatuses.some((status) => status === "FAILURE")) {
    return "FAILURE";
  }
  if (jobStatuses.some((status) => status === "CANCELED")) {
    return "CANCELED";
  }
  if (jobStatuses.every((status) => status === "SUCCESS")) {
    return "SUCCESS";
  }
  if (jobStatuses.some((status) => status === "RUNNING")) {
    return "RUNNING";
  }
  if (jobStatuses.some((status) => status === "QUEUED")) {
    return "QUEUED";
  }
  return pipelineStatus;
}
