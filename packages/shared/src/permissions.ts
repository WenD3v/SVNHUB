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

export type AuditLogDomain =
  | "users"
  | "teams"
  | "issues"
  | "avatar"
  | "notifications"
  | "repositories"
  | "auth"
  | "other";

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  username: string | null;
  repositoryId?: string | null;
  repositorySlug?: string | null;
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

export const AUDIT_LOG_DOMAINS: AuditLogDomain[] = [
  "users",
  "teams",
  "issues",
  "avatar",
  "notifications",
  "repositories",
  "auth",
  "other",
];

export function resolveAuditLogDomain(
  resourceType: string,
  action: string,
): AuditLogDomain {
  if (resourceType === "notification") {
    return "notifications";
  }
  if (resourceType === "user" && action.startsWith("user.avatar.")) {
    return "avatar";
  }
  if (resourceType === "user" || resourceType === "access_token") {
    return "users";
  }
  if (resourceType === "team" || resourceType === "repo_team" || resourceType === "group") {
    return "teams";
  }
  if (resourceType === "issue" || resourceType === "label") {
    return "issues";
  }
  if (
    resourceType === "repository" ||
    resourceType === "repo_member" ||
    resourceType === "path_permission" ||
    resourceType === "repo_policy"
  ) {
    return "repositories";
  }
  if (resourceType === "auth" || action.startsWith("auth.")) {
    return "auth";
  }
  return "other";
}

export type AuditDomainWhere = Record<string, unknown>;

export function auditDomainWhere(domain: AuditLogDomain): AuditDomainWhere {
  switch (domain) {
    case "notifications":
      return { resourceType: "notification" };
    case "avatar":
      return { resourceType: "user", action: { startsWith: "user.avatar." } };
    case "users":
      return {
        OR: [{ resourceType: "user" }, { resourceType: "access_token" }],
        NOT: { action: { startsWith: "user.avatar." } },
      };
    case "teams":
      return { resourceType: { in: ["team", "repo_team", "group"] } };
    case "issues":
      return { resourceType: { in: ["issue", "label"] } };
    case "repositories":
      return {
        resourceType: {
          in: ["repository", "repo_member", "path_permission", "repo_policy"],
        },
      };
    case "auth":
      return { OR: [{ resourceType: "auth" }, { action: { startsWith: "auth." } }] };
    case "other":
      return {
        NOT: {
          OR: [
            { resourceType: "notification" },
            { resourceType: "user" },
            { resourceType: "access_token" },
            { resourceType: "team" },
            { resourceType: "repo_team" },
            { resourceType: "group" },
            { resourceType: "issue" },
            { resourceType: "label" },
            { resourceType: "repository" },
            { resourceType: "repo_member" },
            { resourceType: "path_permission" },
            { resourceType: "repo_policy" },
            { resourceType: "auth" },
          ],
        },
      };
    default:
      return {};
  }
}
