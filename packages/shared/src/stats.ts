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
