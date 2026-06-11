import { Body, Controller, Patch, Post, Req } from "@nestjs/common";
import type { UserProfile } from "@svnhub/shared";

import type { AuthenticatedUser } from "../auth/strategies/jwt.strategy";
import { ChangePasswordDto, UpdateProfileDto } from "./dto/users.dto";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch("me")
  updateProfile(
    @Body() dto: UpdateProfileDto,
    @Req() req: { user?: AuthenticatedUser },
  ): Promise<UserProfile> {
    return this.usersService.updateProfile(req.user!.id, dto);
  }

  @Post("me/password")
  changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: { user?: AuthenticatedUser; ip?: string },
  ): Promise<{ ok: true }> {
    return this.usersService
      .changePassword(req.user!.id, dto, req.ip)
      .then(() => ({ ok: true as const }));
  }
}
