import { Injectable } from "@nestjs/common";
import type { AuditLogResponse } from "@svnhub/shared";

import { PrismaService } from "../prisma/prisma.service";

export interface AuditLogInput {
  userId?: string | null;
  repositoryId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        repositoryId: input.repositoryId ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        metadata: (input.metadata ?? undefined) as object | undefined,
        ipAddress: input.ipAddress ?? null,
      },
    });
  }

  async listGlobal(limit = 50, offset = 0): Promise<AuditLogResponse> {
    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          user: { select: { username: true } },
          repository: { select: { slug: true } },
        },
      }),
      this.prisma.auditLog.count(),
    ]);

    return {
      entries: rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        username: row.user?.username ?? null,
        repositoryId: row.repositoryId,
        repositorySlug: row.repository?.slug ?? null,
        action: row.action,
        resourceType: row.resourceType,
        resourceId: row.resourceId,
        metadata: row.metadata as Record<string, unknown> | null,
        createdAt: row.createdAt.toISOString(),
      })),
      total,
    };
  }

  async listForRepository(
    repositoryId: string,
    limit = 50,
    offset = 0,
  ): Promise<AuditLogResponse> {
    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { repositoryId },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: { user: { select: { username: true } } },
      }),
      this.prisma.auditLog.count({ where: { repositoryId } }),
    ]);

    return {
      entries: rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        username: row.user?.username ?? null,
        action: row.action,
        resourceType: row.resourceType,
        resourceId: row.resourceId,
        metadata: row.metadata as Record<string, unknown> | null,
        createdAt: row.createdAt.toISOString(),
      })),
      total,
    };
  }
}
