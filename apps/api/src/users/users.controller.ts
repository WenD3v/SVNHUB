import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { stat } from "node:fs/promises";

import type {
  PublicUserProfile,
  UserActivityResponse,
  UserHeatmapResponse,
  UserProfile,
} from "@svnhub/shared";

import { Public } from "../common/decorators/public.decorator";
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard";
import type { AuthenticatedUser } from "../auth/strategies/jwt.strategy";
import { AvatarService } from "./avatar.service";
import { ChangePasswordDto, HeatmapQueryDto, UpdateProfileDto } from "./dto/users.dto";
import { UserStatsService } from "./user-stats.service";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly avatarService: AvatarService,
    private readonly userStatsService: UserStatsService,
  ) {}

  @Patch("me")
  updateProfile(
    @Body() dto: UpdateProfileDto,
    @Req() req: { user?: AuthenticatedUser },
  ): Promise<UserProfile> {
    return this.usersService.updateProfile(req.user!.id, dto);
  }

  @Get("me")
  getProfile(@Req() req: { user?: AuthenticatedUser }): Promise<UserProfile> {
    return this.usersService.getProfile(req.user!.id);
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

  @Post("me/avatar")
  @UseInterceptors(
    FileInterceptor("avatar", {
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  uploadAvatar(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: { user?: AuthenticatedUser; ip?: string },
  ): Promise<UserProfile> {
    if (!file) {
      throw new BadRequestException("Avatar file is required");
    }

    return this.avatarService.uploadAvatar(
      req.user!.id,
      {
        buffer: file.buffer,
        mimetype: file.mimetype,
        size: file.size,
      },
      req.ip,
    );
  }

  @Delete("me/avatar")
  removeAvatar(@Req() req: { user?: AuthenticatedUser; ip?: string }): Promise<UserProfile> {
    return this.avatarService.removeAvatar(req.user!.id, req.ip);
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(":username/stats/heatmap")
  heatmap(
    @Param("username") username: string,
    @Query() query: HeatmapQueryDto,
    @Req() req: { user?: AuthenticatedUser | null },
  ): Promise<UserHeatmapResponse> {
    return this.userStatsService.getHeatmap(username, req.user?.id, query);
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(":username/stats/activity")
  activity(
    @Param("username") username: string,
    @Req() req: { user?: AuthenticatedUser | null },
  ): Promise<UserActivityResponse> {
    return this.userStatsService.getActivity(username, req.user?.id);
  }

  @Public()
  @Get(":username/avatar")
  async serveAvatar(
    @Param("username") username: string,
    @Req() req: { headers?: { "if-none-match"?: string } },
    @Res() res: Response,
  ): Promise<void> {
    const user = await this.usersService.findByUsername(username);
    if (!user) {
      throw new NotFoundException("Avatar not found");
    }

    const filePath = this.avatarService.getAvatarFilePath(user.id);

    let fileStat;
    try {
      fileStat = await stat(filePath);
    } catch {
      throw new NotFoundException("Avatar not found");
    }

    const etag = `"${fileStat.mtimeMs}-${fileStat.size}"`;
    if (req.headers?.["if-none-match"] === etag) {
      res.status(304).end();
      return;
    }

    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("ETag", etag);
    res.setHeader("Content-Type", "image/webp");
    res.sendFile(filePath);
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(":username")
  publicProfile(
    @Param("username") username: string,
    @Req() req: { user?: AuthenticatedUser | null },
  ): Promise<PublicUserProfile> {
    return this.userStatsService.getPublicProfile(username, req.user?.id);
  }
}
