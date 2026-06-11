import type { SvnDiffFile, SvnLogEntry } from "./svn.js";

export type PullRequestStatus = "OPEN" | "MERGED" | "CLOSED";

export type PRReviewDecision = "APPROVED" | "CHANGES_REQUESTED";

export type PRStatusCheckStatus = "PENDING" | "SUCCESS" | "FAILURE";

export type PRCommentSide = "LEFT" | "RIGHT";

export interface PullRequestAuthorSummary {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface PullRequestSummary {
  id: string;
  number: number;
  title: string;
  status: PullRequestStatus;
  sourceRef: string;
  targetRef: string;
  author: PullRequestAuthorSummary;
  mergeRevision: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PullRequestListResponse {
  pullRequests: PullRequestSummary[];
  total: number;
}

export interface PRCommentSummary {
  id: string;
  body: string;
  path: string | null;
  line: number | null;
  side: PRCommentSide | null;
  author: PullRequestAuthorSummary;
  createdAt: string;
  updatedAt: string;
}

export interface PRReviewSummary {
  id: string;
  decision: PRReviewDecision;
  body: string | null;
  author: PullRequestAuthorSummary;
  createdAt: string;
  updatedAt: string;
}

export interface PRStatusCheckSummary {
  id: string;
  name: string;
  status: PRStatusCheckStatus;
  targetRevision: number | null;
  detailsUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MergeEligibility {
  canMerge: boolean;
  reasons: string[];
  approvalCount: number;
  minApprovals: number;
  hasConflicts: boolean;
}

export interface PullRequestDetail extends PullRequestSummary {
  description: string | null;
  sourcePath: string;
  targetPath: string;
  mergedAt: string | null;
  closedAt: string | null;
  mergedBy: PullRequestAuthorSummary | null;
  comments: PRCommentSummary[];
  reviews: PRReviewSummary[];
  statusChecks: PRStatusCheckSummary[];
  mergeEligibility: MergeEligibility;
}

export interface MergePreviewResponse {
  changedPaths: string[];
  conflictPaths: string[];
  hasConflicts: boolean;
  files: SvnDiffFile[];
}

export interface MergePullRequestResponse {
  mergeRevision: number;
  pullRequest: PullRequestDetail;
}

export interface CreatePullRequestRequest {
  sourceRef: string;
  targetRef?: string;
  title: string;
  description?: string;
}

export interface CreatePRCommentRequest {
  body: string;
  path?: string;
  line?: number;
  side?: PRCommentSide;
}

export interface CreatePRReviewRequest {
  decision: PRReviewDecision;
  body?: string;
}

export interface MergePullRequestRequest {
  deleteSourceBranch?: boolean;
}

export interface PullRequestCommitsResponse {
  commits: SvnLogEntry[];
}
