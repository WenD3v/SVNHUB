import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type {
  ChangelogSection,
  RepositoryChangelogResponse,
  SvnChangedPath,
  SvnLogEntry,
} from "@svnhub/shared";

import { BranchesService } from "../branches/branches.service";
import { PrismaService } from "../prisma/prisma.service";
import { SvnEngineService } from "../svn-engine/svn-engine.service";

@Injectable()
export class ChangelogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchesService: BranchesService,
    private readonly svnEngine: SvnEngineService,
  ) {}

  async getChangelog(slug: string, limit = 100): Promise<RepositoryChangelogResponse> {
    const repository = await this.requireRepository(slug);
    const tagsResponse = await this.branchesService.listTags(slug);
    const tags = [...tagsResponse.refs].sort(
      (left, right) => right.createdRevision - left.createdRevision,
    );

    const headRevision = (await this.svnEngine.info(repository.svnPath)).revision;
    const sections: ChangelogSection[] = [];

    const latestTagRevision = tags[0]?.createdRevision ?? 0;
    if (headRevision > latestTagRevision) {
      const entries = await this.getRevisionsInRange(
        repository.id,
        latestTagRevision,
        headRevision,
        limit,
      );
      if (entries.length > 0) {
        sections.push({
          name: "Unreleased",
          kind: "unreleased",
          createdRevision: headRevision,
          createdAuthor: entries[0]?.author ?? "",
          createdDate: entries[0]?.date ?? new Date().toISOString(),
          revisionFrom: latestTagRevision,
          revisionTo: headRevision,
          previousTagName: tags[0]?.name ?? null,
          entries,
        });
      }
    }

    for (let index = 0; index < tags.length; index += 1) {
      const tag = tags[index]!;
      const previousTag = tags[index + 1];
      const revisionFrom = previousTag?.createdRevision ?? 0;
      const entries = await this.getRevisionsInRange(
        repository.id,
        revisionFrom,
        tag.createdRevision,
        limit,
      );

      sections.push({
        name: tag.name,
        kind: "tag",
        createdRevision: tag.createdRevision,
        createdAuthor: tag.createdAuthor,
        createdDate: tag.createdDate,
        revisionFrom,
        revisionTo: tag.createdRevision,
        previousTagName: previousTag?.name ?? null,
        entries,
      });
    }

    return { sections };
  }

  private async getRevisionsInRange(
    repositoryId: string,
    revisionFromExclusive: number,
    revisionToInclusive: number,
    limit: number,
  ): Promise<SvnLogEntry[]> {
    const rows = await this.prisma.revisionIndex.findMany({
      where: {
        repositoryId,
        revision: {
          gt: revisionFromExclusive,
          lte: revisionToInclusive,
        },
      },
      orderBy: { revision: "desc" },
      take: limit,
    });

    return rows.map((row) => this.fromRow(row));
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

  private async requireRepository(slug: string) {
    const repository = await this.prisma.repository.findUnique({ where: { slug } });
    if (!repository) {
      throw new NotFoundException("Repository not found");
    }
    return repository;
  }
}
