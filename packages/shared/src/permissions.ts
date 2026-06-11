import type { RepoRole } from "./user.js";

export type PathAccess = "READ" | "WRITE" | "NONE";

export type PrincipalType = "USER" | "GROUP";

export interface GroupSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  memberCount: number;
}

export interface GroupDetail extends GroupSummary {
  members: Array<{
    id: string;
    userId: string;
    username: string;
    displayName: string | null;
    role: "MEMBER" | "ADMIN";
  }>;
}

export interface RepoMemberSummary {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  email: string;
  role: RepoRole;
}

export interface PathPermissionSummary {
  id: string;
  path: string;
  principalType: PrincipalType;
  principalId: string;
  principalName: string;
  access: PathAccess;
}

export interface RepoPolicySettings {
  blockTrunkDirectCommit: boolean;
  blockTagsWrite: boolean;
  requireCommitMessage: boolean;
  commitMessageRegex: string | null;
  maxFileSizeBytes: number | null;
  minApprovals: number;
}

export interface RefSummary {
  name: string;
  kind: "branch" | "tag";
  svnPath: string;
  isDefault?: boolean;
  createdRevision: number;
  createdAuthor: string;
  createdDate: string;
  lastChangedRevision: number;
  lastChangedAuthor: string;
  lastChangedDate: string;
}

export interface RefListResponse {
  refs: RefSummary[];
}

export interface CompareBranchesRequest {
  sourceRef: string;
  targetRef: string;
  sourceKind?: "branch" | "tag";
  targetKind?: "branch" | "tag";
}

export interface AccessTokenSummary {
  id: string;
  name: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface AccessTokenCreated extends AccessTokenSummary {
  /** Raw token — shown only once at creation. */
  token: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  username: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLogResponse {
  entries: AuditLogEntry[];
  total: number;
}
