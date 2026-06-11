import type { GroupRole, RepoRole } from "./user.js";

export interface TeamSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  memberCount: number;
}

export interface TeamMemberSummary {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  role: GroupRole;
}

export interface TeamLinkedRepository {
  id: string;
  slug: string;
  name: string;
  role: RepoRole;
}

export interface TeamDetail extends TeamSummary {
  members: TeamMemberSummary[];
  repositories: TeamLinkedRepository[];
}

export interface RepoTeamSummary {
  id: string;
  teamId: string;
  teamSlug: string;
  teamName: string;
  role: RepoRole;
}

export interface CreateTeamRequest {
  name: string;
  description?: string;
}

export interface UpdateTeamRequest {
  name?: string;
  description?: string | null;
}

export interface AddTeamMemberRequest {
  userId: string;
  role?: GroupRole;
}

export interface LinkRepoTeamRequest {
  teamSlug: string;
  role: RepoRole;
}

export interface UpdateRepoTeamRequest {
  role: RepoRole;
}
