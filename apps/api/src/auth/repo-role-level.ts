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

export function maxRepoRole(...roles: Array<RepoRole | null | undefined>): RepoRole | null {
  let best: RepoRole | null = null;
  for (const role of roles) {
    if (!role) continue;
    if (!best || REPO_ROLE_LEVEL[role] > REPO_ROLE_LEVEL[best]) {
      best = role;
    }
  }
  return best;
}
