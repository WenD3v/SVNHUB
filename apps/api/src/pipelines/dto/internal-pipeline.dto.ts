import { IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";

export class UpdateJobStatusDto {
  @IsIn(["RUNNING", "SUCCESS", "FAILURE", "CANCELED"])
  status!: "RUNNING" | "SUCCESS" | "FAILURE" | "CANCELED";

  @IsOptional()
  @IsInt()
  exitCode?: number;
}

export class AppendJobLogDto {
  @IsInt()
  @Min(0)
  sequence!: number;

  @IsString()
  content!: string;
}

export class RegisterArtifactDto {
  @IsString()
  name!: string;

  @IsString()
  path!: string;

  @IsInt()
  @Min(0)
  sizeBytes!: number;

  @IsOptional()
  @IsString()
  retentionUntil?: string;
}
