import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";

import type { PRCommentSide, PRReviewDecision, PullRequestStatus } from "@svnhub/shared";

export class ListPullRequestsQueryDto {
  @IsOptional()
  @IsEnum(["OPEN", "MERGED", "CLOSED"])
  status?: PullRequestStatus;
}

export class CreatePullRequestDto {
  @IsString()
  @MinLength(1)
  sourceRef!: string;

  @IsOptional()
  @IsString()
  targetRef?: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdatePullRequestDto {
  @IsEnum(["OPEN", "CLOSED"])
  status!: "OPEN" | "CLOSED";
}

export class CreatePRCommentDto {
  @IsString()
  @MinLength(1)
  body!: string;

  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  line?: number;

  @IsOptional()
  @IsEnum(["LEFT", "RIGHT"])
  side?: PRCommentSide;
}

export class CreatePRReviewDto {
  @IsEnum(["APPROVED", "CHANGES_REQUESTED"])
  decision!: PRReviewDecision;

  @IsOptional()
  @IsString()
  body?: string;
}

export class MergePullRequestDto {
  @IsOptional()
  @IsBoolean()
  deleteSourceBranch?: boolean;
}
