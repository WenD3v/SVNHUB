import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
} from "class-validator";

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9_-]{1,30}$/i;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}/;

export class ListAdminUsersQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(["active", "inactive", "all"])
  status?: "active" | "inactive" | "all";

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

export class CreateAdminUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Matches(USERNAME_PATTERN, {
    message: "username must be 2-31 alphanumeric characters, hyphens or underscores",
  })
  username!: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean;
}

export class UpdateAdminUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  displayName?: string | null;

  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ResetAdminUserPasswordDto {
  @IsString()
  @MinLength(8)
  password!: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  displayName?: string | null;

  @IsOptional()
  @IsString()
  bio?: string | null;
}

export class HeatmapQueryDto {
  @IsOptional()
  @IsString()
  @Matches(ISO_DATE_PATTERN, { message: "from must be an ISO date string" })
  from?: string;

  @IsOptional()
  @IsString()
  @Matches(ISO_DATE_PATTERN, { message: "to must be an ISO date string" })
  to?: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}
