import { Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
} from "class-validator";

import type { IssueStatus } from "@svnhub/shared";

export class ListIssuesQueryDto {
  @IsOptional()
  @IsEnum(["OPEN", "CLOSED"])
  status?: IssueStatus;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  assignee?: string;

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(["createdAt", "updatedAt"])
  sort?: "createdAt" | "updatedAt";

  @IsOptional()
  @IsEnum(["asc", "desc"])
  order?: "asc" | "desc";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export class CreateIssueDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labelIds?: string[];
}

export class UpdateIssueDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsEnum(["OPEN", "CLOSED"])
  status?: IssueStatus;

  @IsOptional()
  @IsString()
  assigneeId?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labelIds?: string[];
}

export class CreateIssueCommentDto {
  @IsString()
  @MinLength(1)
  body!: string;
}

export class UpdateIssueCommentDto {
  @IsString()
  @MinLength(1)
  body!: string;
}

export class CreateLabelDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateLabelDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color?: string;

  @IsOptional()
  @IsString()
  description?: string | null;
}
