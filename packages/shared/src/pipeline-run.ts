import type { PipelineShellStep } from "./pipeline-yaml.js";

export interface PipelineRunJobPayload {
  id: string;
  stageName: string;
  name: string;
  image: string;
  steps: PipelineShellStep[];
  env: Record<string, string>;
  artifactPaths: string[];
  artifactRetentionDays?: number;
  timeoutSeconds: number;
}

export interface PipelineRunPayload {
  pipelineId: string;
  repositoryId: string;
  repositorySlug: string;
  svnRepoPath: string;
  revision: number;
  branchPath: string;
  jobs: PipelineRunJobPayload[];
}

export interface AppendJobLogRequest {
  sequence: number;
  content: string;
}

export interface UpdateJobStatusRequest {
  status: "RUNNING" | "SUCCESS" | "FAILURE" | "CANCELED";
  exitCode?: number;
}

export interface RegisterArtifactRequest {
  name: string;
  path: string;
  sizeBytes: number;
  retentionUntil?: string;
}
