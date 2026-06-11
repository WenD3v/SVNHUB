import type { RepositoryHealthSummary } from "./backups.js";

export type SvnNodeKind = "file" | "dir";

export type SvnChangeAction = "A" | "M" | "D" | "R" | "T";

export interface SvnChangedPath {
  path: string;
  action: SvnChangeAction;
  copyFromPath?: string;
  copyFromRev?: number;
}

export interface SvnLogEntry {
  revision: number;
  author: string;
  date: string;
  message: string;
  paths: SvnChangedPath[];
}

export interface SvnTreeEntry {
  name: string;
  path: string;
  kind: SvnNodeKind;
  size?: number;
}

export interface SvnRepoInfo {
  repositoryRoot: string;
  uuid: string;
  revision: number;
  lastChangedRev?: number;
  lastChangedDate?: string;
  lastChangedAuthor?: string;
}

export interface SvnBlameLine {
  lineNumber: number;
  revision: number;
  author: string;
  date: string;
  text: string;
}

export interface SvnDiffFile {
  path: string;
  kind: "file" | "dir";
  action: SvnChangeAction;
  /** Unified diff text for file changes. */
  diff?: string;
}

export interface SvnLogQuery {
  path?: string;
  revision?: string;
  limit?: number;
  offset?: number;
  author?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface RepositoryDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  defaultBranch: string;
  isArchived: boolean;
  svnPath: string;
  headRevision: number;
  checkoutUrl: string;
  svnUrl: string;
  health: RepositoryHealthSummary;
  createdAt: string;
  updatedAt: string;
}

export interface RepositoryTreeResponse {
  ref: string;
  revision: number;
  path: string;
  entries: SvnTreeEntry[];
  readme: string | null;
}

export interface RepositoryFileContentResponse {
  ref: string;
  revision: number;
  path: string;
  content: string;
  size: number;
  mimeType: string;
  isBinary: boolean;
}

export interface RepositoryLogResponse {
  entries: SvnLogEntry[];
  total: number;
  hasMore: boolean;
}

export interface RepositoryDiffResponse {
  revision?: number;
  sourcePath?: string;
  targetPath?: string;
  sourceRevision?: string;
  targetRevision?: string;
  files: SvnDiffFile[];
}

export interface RepositoryBlameResponse {
  ref: string;
  revision: number;
  path: string;
  lines: SvnBlameLine[];
}
