export type RepoRole = "OWNER" | "MAINTAINER" | "DEVELOPER" | "READER";

export type GroupRole = "MEMBER" | "ADMIN";

export interface UserSummary {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}
