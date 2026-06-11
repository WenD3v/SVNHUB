import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class TriggerPipelineDto {
  @IsOptional()
  @IsString()
  branchPath?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  revision?: number;
}
