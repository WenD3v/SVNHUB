import { Controller, Get, Query, Req } from "@nestjs/common";
import type { DashboardResponse } from "@svnhub/shared";

import type { AuthenticatedUser } from "../auth/strategies/jwt.strategy";
import { DashboardService } from "./dashboard.service";
import { DashboardActivityQueryDto } from "./dto/dashboard-query.dto";

@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  getDashboard(
    @Req() req: { user: AuthenticatedUser },
    @Query() query: DashboardActivityQueryDto,
  ): Promise<DashboardResponse> {
    return this.dashboardService.getDashboard(req.user.id, {
      limit: query.limit,
      offset: query.offset,
    });
  }
}
