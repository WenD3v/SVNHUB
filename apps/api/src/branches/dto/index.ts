import { Type } from "class-transformer";
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";

import type { RepoRole } from "@svnhub/shared";

export class CreateBranchDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  sourceRef?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  sourceRevision?: number;
}

export class CreateTagDto extends CreateBranchDto {}

export class CompareBranchesQueryDto {
  @IsString()
  sourceRef!: string;

  @IsString()
  targetRef!: string;
}

export class AddMemberDto {
  @IsString()
  userId!: string;

  @IsEnum(["OWNER", "MAINTAINER", "DEVELOPER", "READER"])
  role!: RepoRole;
}

export class UpdateMemberRoleDto {
  @IsEnum(["OWNER", "MAINTAINER", "DEVELOPER", "READER"])
  role!: RepoRole;
}

export class UpsertPathPermissionDto {
  @IsString()
  path!: string;

  @IsEnum(["USER", "GROUP"])
  principalType!: "USER" | "GROUP";

  @IsString()
  principalId!: string;

  @IsEnum(["READ", "WRITE", "NONE"])
  access!: "READ" | "WRITE" | "NONE";
}

export class UpdatePolicyDto {
  @IsOptional()
  @IsBoolean()
  blockTrunkDirectCommit?: boolean;

  @IsOptional()
  @IsBoolean()
  blockTagsWrite?: boolean;

  @IsOptional()
  @IsBoolean()
  requireCommitMessage?: boolean;

  @IsOptional()
  @IsString()
  commitMessageRegex?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxFileSizeBytes?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  minApprovals?: number;
}

export class CreateGroupDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;
}

export class AddGroupMemberDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsEnum(["MEMBER", "ADMIN"])
  role?: "MEMBER" | "ADMIN";
}

export class CreateAccessTokenDto {
  @IsString()
  name!: string;

  @IsOptional()
  scopes?: string[];

  @IsOptional()
  @IsString()
  expiresAt?: string;
}

export class ValidatePreCommitDto {
  @IsString()
  txn!: string;
}

export class AuditQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
