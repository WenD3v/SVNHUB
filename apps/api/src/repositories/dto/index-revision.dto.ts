import { IsInt, Min } from "class-validator";
import { Type } from "class-transformer";

export class IndexRevisionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  revision!: number;
}
