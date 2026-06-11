import type { RepositorySummary } from "./repository.js";

export interface SearchUserResult {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface SearchResponse {
  repositories: RepositorySummary[];
  users: SearchUserResult[];
}

export interface SearchQuery {
  q: string;
}
