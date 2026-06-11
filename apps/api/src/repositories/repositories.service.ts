import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Archiver } from "archiver";
import archiver from "archiver";
import { createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type {
  RefKind,
  RepositoryBlameResponse,
  RepositoryDetail,
  RepositoryDiffResponse,
  RepositoryFileContentResponse,
  RepositoryLogResponse,
  RepositorySummary,
  RepositoryTreeResponse,
  SvnLogQuery,
} from "@svnhub/shared";
import {
  DEFAULT_BRANCH_UI,
  slugifyRepoName,
  svnPathToUiPath,
  uiPathToSvnPath,
} from "@svnhub/shared";

import { PrismaService } from "../prisma/prisma.service";
import { BackupsService } from "../backups/backups.service";
import { AuthzService } from "../permissions/authz.service";
import { SvnEngineService } from "../svn-engine/svn-engine.service";
import { ensureApacheRepoOwnership } from "../svn-engine/svn-repo-ownership";
import { PipelinesService } from "../pipelines/pipelines.service";
import { WebhooksService } from "../webhooks/webhooks.service";
import { HooksService } from "./hooks.service";
import { RevisionIndexService } from "./revision-index.service";

export interface CreateRepositoryInput {
  name: string;
  description?: string;
  actorUserId?: string;
}

@Injectable()
export class RepositoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly svnEngine: SvnEngineService,
    private readonly backupsService: BackupsService,
    private readonly hooksService: HooksService,
    private readonly revisionIndexService: RevisionIndexService,
    private readonly configService: ConfigService,
    private readonly authzService: AuthzService,
    private readonly pipelinesService: PipelinesService,
    private readonly webhooksService: WebhooksService,
  ) {}

  async list(): Promise<RepositorySummary[]> {
    const repos = await this.prisma.repository.findMany({
      orderBy: { updatedAt: "desc" },
    });

    return repos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      slug: repo.slug,
      description: repo.description,
      defaultBranch: repo.defaultBranch,
      isArchived: repo.isArchived,
    }));
  }

  async create(input: CreateRepositoryInput): Promise<RepositoryDetail> {
    const slug = slugifyRepoName(input.name);
    if (!slug) {
      throw new BadRequestException("Invalid repository name");
    }

    const existing = await this.prisma.repository.findFirst({
      where: { OR: [{ slug }, { name: input.name }] },
    });
    if (existing) {
      throw new ConflictException("Repository already exists");
    }

    const repoPath = await this.svnEngine.createRepository(slug);

    const repository = await this.prisma.repository.create({
      data: {
        name: input.name,
        slug,
        description: input.description ?? null,
        svnPath: repoPath,
        policy: { create: {} },
      },
    });

    await this.hooksService.installHooks(repoPath, repository.id);
    ensureApacheRepoOwnership(repoPath);

    if (input.actorUserId) {
      await this.prisma.repoMember.upsert({
        where: {
          userId_repositoryId: {
            userId: input.actorUserId,
            repositoryId: repository.id,
          },
        },
        create: {
          userId: input.actorUserId,
          repositoryId: repository.id,
          role: "OWNER",
        },
        update: { role: "OWNER" },
      });
    }

    await this.revisionIndexService.indexRevision(repository.id, repoPath, 1);
    await this.authzService.rebuildAll();

    return this.toDetail(repository);
  }

  async findBySlug(slug: string): Promise<RepositoryDetail> {
    const repository = await this.prisma.repository.findUnique({ where: { slug } });
    if (!repository) {
      throw new NotFoundException("Repository not found");
    }
    return this.toDetail(repository);
  }

  async archive(slug: string): Promise<RepositoryDetail> {
    const repository = await this.prisma.repository.update({
      where: { slug },
      data: { isArchived: true },
    });
    return this.toDetail(repository);
  }

  async remove(slug: string): Promise<void> {
    const repository = await this.prisma.repository.findUnique({ where: { slug } });
    if (!repository) {
      throw new NotFoundException("Repository not found");
    }

    await this.prisma.repository.delete({ where: { slug } });
    await this.svnEngine.deleteRepository(repository.slug);
  }

  async getTree(
    slug: string,
    ref: string,
    uiPath: string,
    revision?: number,
    kind: RefKind = "branch",
  ): Promise<RepositoryTreeResponse> {
    const repository = await this.requireRepository(slug);
    const svnPath = uiPathToSvnPath(uiPath, ref, kind);
    const headRevision =
      revision ?? (await this.svnEngine.info(repository.svnPath)).revision;

    const entries = await this.svnEngine.listTree(
      repository.svnPath,
      svnPath,
      headRevision,
    );

    const readme = await this.tryReadReadme(
      repository.svnPath,
      svnPath,
      headRevision,
    );

    return {
      ref,
      revision: headRevision,
      path: uiPath,
      entries: entries.map((entry) => ({
        ...entry,
        path: svnPathToUiPath(entry.path, ref, kind),
      })),
      readme,
    };
  }

  async getFileContent(
    slug: string,
    ref: string,
    uiPath: string,
    revision?: number,
    kind: RefKind = "branch",
  ): Promise<RepositoryFileContentResponse> {
    const repository = await this.requireRepository(slug);
    const svnPath = uiPathToSvnPath(uiPath, ref, kind);
    const headRevision =
      revision ?? (await this.svnEngine.info(repository.svnPath, undefined)).revision;

    const { content, isBinary } = await this.svnEngine.cat(
      repository.svnPath,
      svnPath,
      headRevision,
    );

    const mimeType = isBinary ? "application/octet-stream" : guessMimeType(uiPath);

    return {
      ref,
      revision: headRevision,
      path: uiPath,
      content: isBinary ? content.toString("base64") : content.toString("utf8"),
      size: content.byteLength,
      mimeType,
      isBinary,
    };
  }

  async getLog(
    slug: string,
    query: SvnLogQuery & { ref?: string; kind?: RefKind },
  ): Promise<RepositoryLogResponse> {
    const repository = await this.requireRepository(slug);

    const indexed = await this.revisionIndexService.listIndexedRevisions(repository.id, {
      limit: query.limit,
      offset: query.offset,
      author: query.author,
      search: query.search,
      path: query.path
        ? uiPathToSvnPath(query.path, query.ref ?? DEFAULT_BRANCH_UI, query.kind ?? "branch")
        : undefined,
      revisionFrom: query.revision ? Number.parseInt(query.revision.split(":")[0] ?? "", 10) : undefined,
      revisionTo: query.revision?.includes(":")
        ? Number.parseInt(query.revision.split(":")[1] ?? "", 10)
        : undefined,
    });

    if (indexed.total > 0) {
      return indexed;
    }

    const svnQuery: SvnLogQuery = {
      ...query,
      path: query.ref
        ? uiPathToSvnPath(query.path ?? "", query.ref, query.kind ?? "branch")
        : query.path,
    };

    const entries = await this.svnEngine.log(repository.svnPath, svnQuery);
    const limit = query.limit ?? 30;
    const offset = query.offset ?? 0;
    const slice = entries.slice(offset, offset + limit + 1);
    const hasMore = slice.length > limit;

    return {
      entries: hasMore ? slice.slice(0, limit) : slice,
      total: entries.length,
      hasMore,
    };
  }

  async getRevisionDetail(slug: string, revision: number): Promise<RepositoryDiffResponse> {
    const repository = await this.requireRepository(slug);
    const files = await this.svnEngine.diffRevision(repository.svnPath, revision);
    return { revision, files };
  }

  async getDiffBetweenPaths(
    slug: string,
    sourcePath: string,
    targetPath: string,
    sourceRevision?: number,
    targetRevision?: number,
  ): Promise<RepositoryDiffResponse> {
    const repository = await this.requireRepository(slug);
    const files = await this.svnEngine.diffPaths(
      repository.svnPath,
      sourcePath,
      targetPath,
      sourceRevision,
      targetRevision,
    );

    return {
      sourcePath,
      targetPath,
      sourceRevision: sourceRevision ? String(sourceRevision) : "HEAD",
      targetRevision: targetRevision ? String(targetRevision) : "HEAD",
      files,
    };
  }

  async getBlame(
    slug: string,
    ref: string,
    uiPath: string,
    revision?: number,
    kind: RefKind = "branch",
  ): Promise<RepositoryBlameResponse> {
    const repository = await this.requireRepository(slug);
    const svnPath = uiPathToSvnPath(uiPath, ref, kind);
    const headRevision =
      revision ?? (await this.svnEngine.info(repository.svnPath)).revision;
    const lines = await this.svnEngine.blame(repository.svnPath, svnPath, headRevision);

    return {
      ref,
      revision: headRevision,
      path: uiPath,
      lines,
    };
  }

  async exportZip(
    slug: string,
    ref: string,
    uiPath: string,
    revision?: number,
    kind: RefKind = "branch",
  ): Promise<string> {
    const repository = await this.requireRepository(slug);
    const svnPath = uiPathToSvnPath(uiPath, ref, kind);
    const headRevision =
      revision ?? (await this.svnEngine.info(repository.svnPath)).revision;

    const tempDir = await mkdtemp(path.join(os.tmpdir(), "svnhub-export-"));
    const exportDir = path.join(tempDir, "content");
    const zipPath = path.join(tempDir, `${repository.slug}.zip`);

    try {
      await this.svnEngine.exportToDirectory(
        repository.svnPath,
        svnPath,
        exportDir,
        headRevision,
      );

      await createZipFromDirectory(exportDir, zipPath);
      return zipPath;
    } catch (error) {
      await rm(tempDir, { recursive: true, force: true });
      throw error;
    }
  }

  async indexRevision(repositoryId: string, revision: number): Promise<void> {
    const repository = await this.prisma.repository.findUnique({
      where: { id: repositoryId },
    });
    if (!repository) {
      throw new NotFoundException("Repository not found");
    }

    await this.revisionIndexService.indexRevision(
      repository.id,
      repository.svnPath,
      revision,
    );

    const indexed = await this.prisma.revisionIndex.findUnique({
      where: {
        repositoryId_revision: { repositoryId, revision },
      },
    });
    const changedPaths = (indexed?.changedPaths as Array<{ path: string }> | null)?.map(
      (entry) => entry.path,
    ) ?? [];

    await this.webhooksService.enqueueDeliveries("REVISION_INDEXED", {
      repositoryId: repository.id,
      repositorySlug: repository.slug,
      data: { revision, changedPaths },
    });

    await this.pipelinesService.onRevisionIndexed(
      repository.id,
      revision,
      changedPaths,
    );
  }

  private async requireRepository(slug: string) {
    const repository = await this.prisma.repository.findUnique({ where: { slug } });
    if (!repository) {
      throw new NotFoundException("Repository not found");
    }
    return repository;
  }

  private async toDetail(repository: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    defaultBranch: string;
    isArchived: boolean;
    svnPath: string;
    createdAt: Date;
    updatedAt: Date;
  }): Promise<RepositoryDetail> {
    let headRevision = 0;
    try {
      headRevision = (await this.svnEngine.info(repository.svnPath)).revision;
    } catch {
      headRevision = 0;
    }

    const httpBase =
      this.configService.get<string>("SVN_HTTP_URL") ?? "http://localhost:8080/svn";
    const svnBase =
      this.configService.get<string>("SVN_SVN_URL") ?? "svn://localhost/svn";
    const health = await this.backupsService.getHealth(repository.id);

    return {
      id: repository.id,
      name: repository.name,
      slug: repository.slug,
      description: repository.description,
      defaultBranch: repository.defaultBranch,
      isArchived: repository.isArchived,
      svnPath: repository.svnPath,
      headRevision,
      checkoutUrl: `${httpBase}/${repository.slug}`,
      svnUrl: `${svnBase}/${repository.slug}`,
      health,
      createdAt: repository.createdAt.toISOString(),
      updatedAt: repository.updatedAt.toISOString(),
    };
  }

  private async tryReadReadme(
    repoPath: string,
    svnPath: string,
    revision: number,
  ): Promise<string | null> {
    const candidates = ["README.md", "readme.md", "README", "Readme.md"];
    for (const name of candidates) {
      const candidatePath =
        svnPath === "/" || svnPath === "" ? `/${name}` : `${svnPath}/${name}`;
      try {
        const { content, isBinary } = await this.svnEngine.cat(
          repoPath,
          candidatePath,
          revision,
        );
        if (!isBinary) {
          return content.toString("utf8");
        }
      } catch {
        // try next candidate
      }
    }
    return null;
  }
}

async function createZipFromDirectory(sourceDir: string, zipPath: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const createArchive = archiver as unknown as (
      format: string,
      options?: { zlib?: { level?: number } },
    ) => Archiver;
    const archive = createArchive("zip", { zlib: { level: 9 } });

    output.on("close", () => resolve());
    archive.on("error", reject);
    archive.pipe(output);
    archive.directory(sourceDir, false);
    void archive.finalize();
  });
}

function guessMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    ".md": "text/markdown",
    ".txt": "text/plain",
    ".json": "application/json",
    ".js": "text/javascript",
    ".ts": "text/typescript",
    ".tsx": "text/typescript",
    ".jsx": "text/javascript",
    ".html": "text/html",
    ".css": "text/css",
    ".xml": "application/xml",
    ".yml": "text/yaml",
    ".yaml": "text/yaml",
  };
  return map[ext] ?? "text/plain";
}
