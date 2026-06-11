import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { AuthResponse, AuthUser } from "@svnhub/shared";

import { Public } from "../common/decorators/public.decorator";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import type { AuthenticatedUser } from "./strategies/jwt.strategy";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("login")
  login(@Body() body: LoginDto, @Req() req: { ip?: string }): Promise<AuthResponse> {
    return this.authService.login(body.email, body.password, req.ip ?? null);
  }

  @Public()
  @Post("refresh")
  refresh(@Body() body: RefreshDto): Promise<AuthResponse> {
    return this.authService.refresh(body.refreshToken);
  }

  @Public()
  @Post("logout")
  async logout(@Body() body: RefreshDto, @Req() req: { user?: AuthenticatedUser; ip?: string }): Promise<{ ok: true }> {
    await this.authService.logout(body.refreshToken, req.user?.id, req.ip ?? null);
    return { ok: true };
  }

  @Get("me")
  me(@Req() req: { user: AuthenticatedUser }): Promise<AuthUser> {
    return this.authService.getProfile(req.user.id);
  }
}
