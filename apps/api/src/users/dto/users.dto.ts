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

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}
