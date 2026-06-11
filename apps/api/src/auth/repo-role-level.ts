import type { RepoRole } from "@svnhub/shared";

const REPO_ROLE_LEVEL: Record<RepoRole, number> = {
  READER: 0,
  DEVELOPER: 1,
  MAINTAINER: 2,
  OWNER: 3,
};

export function hasMinimumRepoRole(userRole: RepoRole, required: RepoRole): boolean {
  return REPO_ROLE_LEVEL[userRole] >= REPO_ROLE_LEVEL[required];
}
