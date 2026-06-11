import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { SvnChangedPath, SvnLogEntry } from "@svnhub/shared";

import { PrismaService } from "../prisma/prisma.service";
import { SvnEngineService } from "../svn-engine/svn-engine.service";

export interface RevisionIndexQuery {
  limit?: number;
  offset?: number;
  author?: string;
  search?: string;
  path?: string;
  revisionFrom?: number;
  revisionTo?: number;
}

@Injectable()
export class RevisionIndexService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly svnEngine: SvnEngineService,
  ) {}

  async indexRevision(repositoryId: string, repoPath: string, revision: number): Promise<void> {
    const entry =
      (await this.svnEngine.svnlookLogEntry(repoPath, revision)) ??
      (await this.svnEngine.logRevision(repoPath, revision));

    if (!entry) {
      return;
    }

    await this.prisma.revisionIndex.upsert({
      where: {
        repositoryId_revision: {
          repositoryId,
          revision,
        },
      },
      create: this.toCreateInput(repositoryId, entry),
      update: this.toUpdateInput(entry),
    });
  }

  async listIndexedRevisions(
    repositoryId: string,
    query: RevisionIndexQuery = {},
  ): Promise<{ entries: SvnLogEntry[]; total: number; hasMore: boolean }> {
    const limit = query.limit ?? 30;
    const offset = query.offset ?? 0;

    const where: Prisma.RevisionIndexWhereInput = {
      repositoryId,
      ...(query.author ? { author: { contains: query.author, mode: "insensitive" } } : {}),
      ...(query.search ? { message: { contains: query.search, mode: "insensitive" } } : {}),
      ...(query.revisionFrom || query.revisionTo
        ? {
            revision: {
              ...(query.revisionFrom ? { gte: query.revisionFrom } : {}),
              ...(query.revisionTo ? { lte: query.revisionTo } : {}),
            },
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.revisionIndex.findMany({
        where,
        orderBy: { revision: "desc" },
        skip: offset,
        take: limit + 1,
      }),
      this.prisma.revisionIndex.count({ where }),
    ]);

    let entries = rows.map((row) => this.fromRow(row));

    if (query.path) {
      entries = entries.filter((entry) =>
        entry.paths.some((changedPath) => changedPath.path.includes(query.path!)),
      );
    }

    const hasMore = entries.length > limit;
    if (hasMore) {
      entries = entries.slice(0, limit);
    }

    return { entries, total, hasMore };
  }

  private fromRow(row: {
    revision: number;
    author: string;
    date: Date;
    message: string;
    changedPaths: Prisma.JsonValue;
  }): SvnLogEntry {
    return {
      revision: row.revision,
      author: row.author,
      date: row.date.toISOString(),
      message: row.message,
      paths: (row.changedPaths as unknown as SvnChangedPath[]) ?? [],
    };
  }

  private toCreateInput(
    repositoryId: string,
    entry: SvnLogEntry,
  ): Prisma.RevisionIndexCreateInput {
    return {
      repository: { connect: { id: repositoryId } },
      revision: entry.revision,
      author: entry.author,
      date: new Date(entry.date),
      message: entry.message,
      changedPaths: entry.paths as unknown as Prisma.InputJsonValue,
    };
  }

  private toUpdateInput(entry: SvnLogEntry): Prisma.RevisionIndexUpdateInput {
    return {
      author: entry.author,
      date: new Date(entry.date),
      message: entry.message,
      changedPaths: entry.paths as unknown as Prisma.InputJsonValue,
    };
  }
}
