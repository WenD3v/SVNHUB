import type { PipelineStatus, PipelineTrigger } from "./pipelines.js";
import type { PullRequestStatus } from "./pull-requests.js";
import type { RepositorySummary } from "./repository.js";

export interface DashboardPullRequestSummary {
  id: string;
  number: number;
  title: string;
  status: PullRequestStatus;
  sourceRef: string;
  targetRef: string;
  repositorySlug: string;
  repositoryName: string;
  authorUsername: string;
  authorDisplayName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardPipelineSummary {
  id: string;
  revision: number;
  branchPath: string;
  trigger: PipelineTrigger;
  status: PipelineStatus;
  repositorySlug: string;
  repositoryName: string;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface DashboardActivityRevision {
  kind: "revision";
  repositorySlug: string;
  repositoryName: string;
  revision: number;
  author: string;
  message: string;
  date: string;
}

export interface DashboardActivityPullRequest {
  kind: "pull_request_opened" | "pull_request_merged" | "pull_request_closed";
  repositorySlug: string;
  repositoryName: string;
  number: number;
  title: string;
  authorUsername: string;
  date: string;
}

export interface DashboardActivityPipeline {
  kind: "pipeline";
  repositorySlug: string;
  repositoryName: string;
  pipelineId: string;
  revision: number;
  status: PipelineStatus;
  trigger: PipelineTrigger;
  date: string;
}

export type DashboardActivityItem =
  | DashboardActivityRevision
  | DashboardActivityPullRequest
  | DashboardActivityPipeline;

export interface DashboardActivityFeed {
  items: DashboardActivityItem[];
  total: number;
  hasMore: boolean;
}

export interface DashboardResponse {
  recentRepositories: RepositorySummary[];
  authoredOpenPullRequests: DashboardPullRequestSummary[];
  reviewRequestedPullRequests: DashboardPullRequestSummary[];
  recentPipelines: DashboardPipelineSummary[];
  activityFeed: DashboardActivityFeed;
}

export interface DashboardActivityQuery {
  limit?: number;
  offset?: number;
}
