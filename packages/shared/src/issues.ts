import type { PullRequestAuthorSummary } from "./pull-requests.js";

export type IssueStatus = "OPEN" | "CLOSED";

export type IssueTimelineEntryType =
  | "opened"
  | "comment"
  | "closed"
  | "reopened"
  | "assigned"
  | "unassigned"
  | "labeled"
  | "unlabeled"
  | "commit_reference"
  | "closed_by_pr";

export type IssueAuthorSummary = PullRequestAuthorSummary;

export interface IssueLabelSummary {
  id: string;
  name: string;
  color: string;
  description: string | null;
}

export interface IssueSummary {
  id: string;
  number: number;
  title: string;
  status: IssueStatus;
  author: IssueAuthorSummary;
  assignee: IssueAuthorSummary | null;
  labels: IssueLabelSummary[];
  commentCount: number;
  closedAt: string | null;
  closedByPrNumber: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface IssueListResponse {
  issues: IssueSummary[];
  total: number;
  openCount: number;
}

export interface IssueCommentSummary {
  id: string;
  body: string;
  author: IssueAuthorSummary;
  createdAt: string;
  updatedAt: string;
}

export interface IssueTimelineEntry {
  id: string;
  type: IssueTimelineEntryType;
  actor: IssueAuthorSummary | null;
  createdAt: string;
  body?: string;
  metadata?: Record<string, unknown>;
}

export interface IssueDetail extends Omit<IssueSummary, "commentCount"> {
  body: string | null;
  comments: IssueCommentSummary[];
  timeline: IssueTimelineEntry[];
}

export interface CreateIssueRequest {
  title: string;
  body?: string;
  assigneeId?: string;
  labelIds?: string[];
}

export interface UpdateIssueRequest {
  title?: string;
  body?: string;
  status?: IssueStatus;
  assigneeId?: string | null;
  labelIds?: string[];
}

export interface CreateIssueCommentRequest {
  body: string;
}

export interface UpdateIssueCommentRequest {
  body: string;
}

export interface CreateLabelRequest {
  name: string;
  color: string;
  description?: string;
}

export interface UpdateLabelRequest {
  name?: string;
  color?: string;
  description?: string | null;
}

export interface LabelListResponse {
  labels: IssueLabelSummary[];
}
