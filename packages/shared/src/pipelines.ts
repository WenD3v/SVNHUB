export type PipelineStatus =
  | "PENDING"
  | "QUEUED"
  | "RUNNING"
  | "SUCCESS"
  | "FAILURE"
  | "CANCELED";

export type PipelineTrigger = "PUSH" | "PR" | "MANUAL";

export type PipelineJobStatus =
  | "QUEUED"
  | "RUNNING"
  | "SUCCESS"
  | "FAILURE"
  | "CANCELED";

export interface PipelineJobSummary {
  id: string;
  stageName: string;
  name: string;
  status: PipelineJobStatus;
  exitCode: number | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface PipelineSummary {
  id: string;
  revision: number;
  branchPath: string;
  trigger: PipelineTrigger;
  status: PipelineStatus;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  createdAt: string;
}

export interface PipelineListResponse {
  pipelines: PipelineSummary[];
  total: number;
}

export interface ArtifactSummary {
  id: string;
  name: string;
  path: string;
  sizeBytes: string;
  retentionUntil: string | null;
  createdAt: string;
}

export interface JobLogChunk {
  jobId: string;
  sequence: number;
  content: string;
  createdAt: string;
}

export interface PipelineDetail extends PipelineSummary {
  jobs: PipelineJobSummary[];
  artifacts: ArtifactSummary[];
}

export interface TriggerPipelineRequest {
  branchPath?: string;
  revision?: number;
}

export interface PipelineLogEvent {
  type: "log";
  jobId: string;
  sequence: number;
  content: string;
}

export interface PipelineStatusEvent {
  type: "status";
  pipelineId: string;
  status: PipelineStatus;
  jobId?: string;
  jobStatus?: PipelineJobStatus;
}

export type PipelineRealtimeEvent = PipelineLogEvent | PipelineStatusEvent;

export const PIPELINE_LOG_CHANNEL_PREFIX = "pipeline-logs:";

export function pipelineLogChannel(jobId: string): string {
  return `${PIPELINE_LOG_CHANNEL_PREFIX}${jobId}`;
}
