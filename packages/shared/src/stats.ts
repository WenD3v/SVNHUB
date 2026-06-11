import type { SvnLogEntry } from "./svn.js";

export interface RepositoryActivityWeek {
  weekStart: string;
  count: number;
}

export interface RepositoryActivityResponse {
  weeks: RepositoryActivityWeek[];
  total: number;
}

export interface RepositoryContributor {
  author: string;
  hasProfile: boolean;
  commits: number;
  firstRevision: number;
  lastRevision: number;
  lastDate: string;
}

export interface RepositoryContributorsResponse {
  contributors: RepositoryContributor[];
}

export interface RepositoryMonthlyActivityMonth {
  monthStart: string;
  count: number;
}

export interface RepositoryMonthlyActivityResponse {
  months: RepositoryMonthlyActivityMonth[];
  total: number;
}

export interface RepositoryAuthorDistributionEntry {
  author: string;
  hasProfile: boolean;
  commits: number;
  percentage: number;
}

export interface RepositoryAuthorDistributionResponse {
  authors: RepositoryAuthorDistributionEntry[];
  total: number;
}

export interface ChangelogSection {
  name: string;
  kind: "tag" | "unreleased";
  createdRevision: number;
  createdAuthor: string;
  createdDate: string;
  revisionFrom: number;
  revisionTo: number;
  previousTagName: string | null;
  entries: SvnLogEntry[];
}

export interface RepositoryChangelogResponse {
  sections: ChangelogSection[];
}
