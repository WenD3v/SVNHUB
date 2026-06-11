import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import type { AuditLogResponse } from "@svnhub/shared";

import { AdminGuard } from "../auth/guards/admin.guard";
import { AuditService } from "./audit.service";

@Controller("admin")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get("audit-log")
  @UseGuards(AdminGuard)
  listGlobal(
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ): Promise<AuditLogResponse> {
    return this.auditService.listGlobal(
      limit ? Number(limit) : 50,
      offset ? Number(offset) : 0,
    );
  }
}
