import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import type { AuditLogDomain, AuditLogResponse } from "@svnhub/shared";
import { AUDIT_LOG_DOMAINS } from "@svnhub/shared";

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
    @Query("domain") domain?: string,
  ): Promise<AuditLogResponse> {
    const normalizedDomain = AUDIT_LOG_DOMAINS.includes(domain as AuditLogDomain)
      ? (domain as AuditLogDomain)
      : undefined;

    return this.auditService.listGlobal(
      limit ? Number(limit) : 50,
      offset ? Number(offset) : 0,
      normalizedDomain,
    );
  }
}
