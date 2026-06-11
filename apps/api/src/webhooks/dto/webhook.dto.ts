import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
} from "class-validator";

const WEBHOOK_EVENTS = [
  "REVISION_INDEXED",
  "PIPELINE_COMPLETED",
  "PR_MERGED",
  "ISSUE_OPENED",
  "ISSUE_CLOSED",
  "ISSUE_COMMENTED",
] as const;

export class CreateWebhookDto {
  @IsUrl({ require_tld: false })
  url!: string;

  @IsString()
  secret!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsIn(WEBHOOK_EVENTS, { each: true })
  events!: Array<(typeof WEBHOOK_EVENTS)[number]>;
}

export class UpdateWebhookDto {
  @IsOptional()
  @IsUrl({ require_tld: false })
  url?: string;

  @IsOptional()
  @IsString()
  secret?: string;

  @IsOptional()
  @IsArray()
  @IsIn(WEBHOOK_EVENTS, { each: true })
  events?: Array<(typeof WEBHOOK_EVENTS)[number]>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
