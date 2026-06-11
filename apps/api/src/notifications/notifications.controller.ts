import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import type { NotificationsResponse, NotificationSummary } from "@svnhub/shared";

import type { AuthenticatedUser } from "../auth/strategies/jwt.strategy";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(
    @Req() req: { user: AuthenticatedUser },
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ): Promise<NotificationsResponse> {
    return this.notificationsService.list(
      req.user.id,
      limit ? Number(limit) : 20,
      offset ? Number(offset) : 0,
    );
  }

  @Post(":id/read")
  async markRead(
    @Req() req: { user: AuthenticatedUser },
    @Param("id") id: string,
  ): Promise<NotificationSummary> {
    try {
      return await this.notificationsService.markRead(req.user.id, id);
    } catch {
      throw new NotFoundException("Notification not found");
    }
  }

  @Post("read-all")
  markAllRead(@Req() req: { user: AuthenticatedUser }) {
    return this.notificationsService.markAllRead(req.user.id);
  }
}
