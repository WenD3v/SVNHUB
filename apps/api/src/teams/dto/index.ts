import { IsEnum, IsOptional, IsString } from "class-validator";

import type { GroupRole, RepoRole } from "@svnhub/shared";

export class CreateTeamDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateTeamDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;
}

export class AddTeamMemberDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsEnum(["MEMBER", "ADMIN"])
  role?: GroupRole;
}

export class LinkRepoTeamDto {
  @IsString()
  teamSlug!: string;

  @IsEnum(["OWNER", "MAINTAINER", "DEVELOPER", "READER"])
  role!: RepoRole;
}

export class UpdateRepoTeamDto {
  @IsEnum(["OWNER", "MAINTAINER", "DEVELOPER", "READER"])
  role!: RepoRole;
}
