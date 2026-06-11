import { SetMetadata } from "@nestjs/common";

import type { RepoRole as RepoRoleLevel } from "@svnhub/shared";

export const REPO_ROLE_KEY = "repoRole";

export const RepoRole = (role: RepoRoleLevel) => SetMetadata(REPO_ROLE_KEY, role);
