import type { PullRequestStatus } from "./pull-requests.js";
import type { RepositorySummary } from "./repository.js";

export interface UserProfileStats {
  repositoryCount: number;
  commitCount: number;
  openPullRequestCount: number;
  mergedPullRequestCount: number;
}

export interface PublicUserProfile {
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
  stats: UserProfileStats;
  repositories: RepositorySummary[];
}

export interface UserHeatmapDay {
  date: string;
  count: number;
}

export interface UserHeatmapResponse {
  days: UserHeatmapDay[];
  total: number;
}

export interface UserHeatmapQuery {
  from?: string;
  to?: string;
}

export interface UserActivityRevision {
  kind: "revision";
  repositorySlug: string;
  repositoryName: string;
  revision: number;
  message: string;
  date: string;
}

export interface UserActivityPullRequest {
  kind: "pull_request_opened" | "pull_request_merged";
  repositorySlug: string;
  repositoryName: string;
  number: number;
  title: string;
  status: PullRequestStatus;
  date: string;
}

export type UserActivityItem = UserActivityRevision | UserActivityPullRequest;

export interface UserActiveRepository {
  slug: string;
  name: string;
  commitCount: number;
}

export interface UserActivityResponse {
  items: UserActivityItem[];
  activeRepositories: UserActiveRepository[];
}

export function buildAvatarUrl(username: string, version?: number | string): string {
  const cacheBuster = version ?? Date.now();
  return `/users/${username}/avatar?v=${cacheBuster}`;
}
