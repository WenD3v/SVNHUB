import { IsDateString, IsInt, IsOptional, Max, Min } from "class-validator";
import { Type } from "class-transformer";

export class ActivityQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(104)
  weeks?: number;
}

export class ContributorsQueryDto {
  @IsOptional()
  @IsDateString()
  since?: string;

  @IsOptional()
  @IsDateString()
  until?: string;
}

export class ChangelogQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}
