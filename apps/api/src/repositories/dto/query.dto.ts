import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { Type } from "class-transformer";

export class TreeQueryDto {
  @IsOptional()
  @IsString()
  ref?: string;

  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  revision?: number;

  @IsOptional()
  @IsString()
  kind?: "branch" | "tag";
}

export class LogQueryDto {
  @IsOptional()
  @IsString()
  ref?: string;

  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @IsString()
  revision?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  kind?: "branch" | "tag";
}

export class DiffPathsQueryDto {
  @IsString()
  sourcePath!: string;

  @IsString()
  targetPath!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sourceRevision?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  targetRevision?: number;
}
