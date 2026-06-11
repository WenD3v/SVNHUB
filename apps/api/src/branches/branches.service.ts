import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";

import type {
  AccessTokenCreated,
  AccessTokenSummary,
  AuditLogResponse,
  RefListResponse,
  RefSummary,
  RepositoryDiffResponse,
} from "@svnhub/shared";
import {
  DEFAULT_BRANCH_UI,
  SVN_BRANCHES,
  SVN_TAGS,
  SVN_TRUNK,
  uiRefToSvnPath,
} from "@svnhub/shared";

import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { validatePreCommit } from "../policies/pre-commit.validator";
import { SvnEngineService } from "../svn-engine/svn-engine.service";

@Injectable()
export class BranchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly svnEngine: SvnEngineService,
    private readonly auditService: AuditService,
  ) {}

  async listBranches(slug: string): Promise<RefListResponse> {
    const repo = await this.requireRepo(slug);
    const refs: RefSummary[] = [];

    const trunkInfo = await this.svnEngine.getPathRefInfo(repo.svnPath, SVN_TRUNK);
    refs.push({
      name: DEFAULT_BRANCH_UI,
      kind: "branch",
      svnPath: SVN_TRUNK,
      isDefault: true,
      ...trunkInfo,
    });

    try {
      const branchEntries = await this.svnEngine.listTree(repo.svnPath, SVN_BRANCHES);
      for (const entry of branchEntries.filter((e) => e.kind === "dir")) {
        const branchPath = `${SVN_BRANCHES}/${entry.name}`;
        const info = await this.svnEngine.getPathRefInfo(repo.svnPath, branchPath);
        refs.push({
          name: entry.name,
          kind: "branch",
          svnPath: branchPath,
          ...info,
        });
      }
    } catch {
      // empty branches dir
    }

    return { refs };
  }

  async listTags(slug: string): Promise<RefListResponse> {
    const repo = await this.requireRepo(slug);
    const refs: RefSummary[] = [];

    try {
      const tagEntries = await this.svnEngine.listTree(repo.svnPath, SVN_TAGS);
      for (const entry of tagEntries.filter((e) => e.kind === "dir")) {
        const tagPath = `${SVN_TAGS}/${entry.name}`;
        const info = await this.svnEngine.getPathRefInfo(repo.svnPath, tagPath);
        refs.push({
          name: entry.name,
          kind: "tag",
          svnPath: tagPath,
          ...info,
        });
      }
    } catch {
      // empty tags dir
    }

    return { refs };
  }

  async createBranch(
    slug: string,
    name: string,
    sourceRef = DEFAULT_BRANCH_UI,
    sourceRevision?: number,
    actorUserId?: string,
  ): Promise<RefSummary> {
    if (!name || name === DEFAULT_BRANCH_UI) {
      throw new BadRequestException("Invalid branch name");
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
      throw new BadRequestException("Branch name contains invalid characters");
    }

    const repo = await this.requireRepo(slug);
    const targetPath = `${SVN_BRANCHES}/${name}`;

    try {
      await this.svnEngine.listTree(repo.svnPath, targetPath);
      throw new ConflictException("Branch already exists");
    } catch (error) {
      if (error instanceof ConflictException) throw error;
    }

    const sourcePath = uiRefToSvnPath(sourceRef, "branch");
    await this.svnEngine.copyPath(
      repo.svnPath,
      sourcePath,
      targetPath,
      `Create branch ${name} from ${sourceRef}`,
      sourceRevision,
    );

    const info = await this.svnEngine.getPathRefInfo(repo.svnPath, targetPath);

    await this.auditService.log({
      userId: actorUserId,
      repositoryId: repo.id,
      action: "branch.create",
      resourceType: "branch",
      resourceId: name,
      metadata: { sourceRef, sourceRevision },
    });

    return { name, kind: "branch", svnPath: targetPath, ...info };
  }

  async createTag(
    slug: string,
    name: string,
    sourceRef = DEFAULT_BRANCH_UI,
    sourceRevision?: number,
    actorUserId?: string,
  ): Promise<RefSummary> {
    if (!name || !/^[a-zA-Z0-9._-]+$/.test(name)) {
      throw new BadRequestException("Invalid tag name");
    }

    const repo = await this.requireRepo(slug);
    const targetPath = `${SVN_TAGS}/${name}`;

    try {
      await this.svnEngine.listTree(repo.svnPath, targetPath);
      throw new ConflictException("Tag already exists");
    } catch (error) {
      if (error instanceof ConflictException) throw error;
    }

    const sourcePath = uiRefToSvnPath(sourceRef, "branch");
    await this.svnEngine.copyPath(
      repo.svnPath,
      sourcePath,
      targetPath,
      `Create tag ${name} from ${sourceRef}`,
      sourceRevision,
    );

    const info = await this.svnEngine.getPathRefInfo(repo.svnPath, targetPath);

    await this.auditService.log({
      userId: actorUserId,
      repositoryId: repo.id,
      action: "tag.create",
      resourceType: "tag",
      resourceId: name,
      metadata: { sourceRef, sourceRevision },
    });

    return { name, kind: "tag", svnPath: targetPath, ...info };
  }

  async deleteBranch(slug: string, name: string, actorUserId?: string): Promise<void> {
    if (name === DEFAULT_BRANCH_UI) {
      throw new BadRequestException("Cannot delete the default branch");
    }

    const repo = await this.requireRepo(slug);
    const svnPath = `${SVN_BRANCHES}/${name}`;
    await this.svnEngine.deletePath(repo.svnPath, svnPath, `Delete branch ${name}`);

    await this.auditService.log({
      userId: actorUserId,
      repositoryId: repo.id,
      action: "branch.delete",
      resourceType: "branch",
      resourceId: name,
    });
  }

  async deleteTag(slug: string, name: string, actorUserId?: string): Promise<void> {
    const repo = await this.requireRepo(slug);
    const svnPath = `${SVN_TAGS}/${name}`;
    await this.svnEngine.deletePath(repo.svnPath, svnPath, `Delete tag ${name}`);

    await this.auditService.log({
      userId: actorUserId,
      repositoryId: repo.id,
      action: "tag.delete",
      resourceType: "tag",
      resourceId: name,
    });
  }

  async compareBranches(
    slug: string,
    sourceRef: string,
    targetRef: string,
  ): Promise<RepositoryDiffResponse> {
    const repo = await this.requireRepo(slug);
    const sourcePath = uiRefToSvnPath(sourceRef, "branch");
    const targetPath = uiRefToSvnPath(targetRef, "branch");
    const files = await this.svnEngine.diffPaths(repo.svnPath, sourcePath, targetPath);

    return {
      sourcePath,
      targetPath,
      sourceRevision: "HEAD",
      targetRevision: "HEAD",
      files,
    };
  }

  async getAuditLog(slug: string, limit = 50, offset = 0): Promise<AuditLogResponse> {
    const repo = await this.requireRepo(slug);
    const result = await this.auditService.listForRepository(repo.id, limit, offset);
    return {
      entries: result.entries.map((entry) => ({
        id: entry.id,
        userId: entry.userId,
        username: entry.username,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        metadata: entry.metadata,
        createdAt: entry.createdAt,
      })),
      total: result.total,
    };
  }

  async validatePreCommitHook(
    repositoryId: string,
    txn: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const repo = await this.prisma.repository.findUnique({
      where: { id: repositoryId },
      include: { policy: true },
    });
    if (!repo) {
      return { allowed: false, reason: "Repository not found" };
    }

    const policy = repo.policy ?? {
      blockTrunkDirectCommit: true,
      blockTagsWrite: true,
      requireCommitMessage: true,
      commitMessageRegex: null,
      maxFileSizeBytes: null,
    };

    const changedPaths = await this.svnEngine.svnlookChangedTxn(repo.svnPath, txn);
    const logMessage = await this.svnEngine.svnlookLogTxn(repo.svnPath, txn);

    const fileSizes: Array<{ path: string; sizeBytes: number }> = [];
    if (policy.maxFileSizeBytes) {
      for (const change of changedPaths) {
        if (change.action === "D") continue;
        try {
          const size = await this.svnEngine.svnlookFileSizeTxn(
            repo.svnPath,
            txn,
            change.path,
          );
          fileSizes.push({ path: change.path, sizeBytes: size });
        } catch {
          // skip unreadable paths
        }
      }
    }

    return validatePreCommit({
      policies: policy,
      logMessage,
      changedPaths,
      fileSizes,
    });
  }

  private async requireRepo(slug: string) {
    const repo = await this.prisma.repository.findUnique({ where: { slug } });
    if (!repo) {
      throw new NotFoundException("Repository not found");
    }
    return repo;
  }
}

@Injectable()
export class AccessTokensService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list(userId: string): Promise<AccessTokenSummary[]> {
    const tokens = await this.prisma.accessToken.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return tokens.map((token) => ({
      id: token.id,
      name: token.name,
      scopes: token.scopes,
      lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
      expiresAt: token.expiresAt?.toISOString() ?? null,
      createdAt: token.createdAt.toISOString(),
    }));
  }

  async create(
    userId: string,
    name: string,
    scopes: string[] = ["repo:read", "repo:write"],
    expiresAt?: string,
  ): Promise<AccessTokenCreated> {
    const rawToken = `svnhub_${randomBytes(32).toString("hex")}`;
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");

    const token = await this.prisma.accessToken.create({
      data: {
        userId,
        name,
        tokenHash,
        scopes,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    await this.auditService.log({
      userId,
      action: "token.create",
      resourceType: "access_token",
      resourceId: token.id,
      metadata: { name, scopes },
    });

    return {
      id: token.id,
      name: token.name,
      scopes: token.scopes,
      lastUsedAt: null,
      expiresAt: token.expiresAt?.toISOString() ?? null,
      createdAt: token.createdAt.toISOString(),
      token: rawToken,
    };
  }

  async revoke(userId: string, tokenId: string): Promise<void> {
    const token = await this.prisma.accessToken.findFirst({
      where: { id: tokenId, userId },
    });
    if (!token) {
      throw new NotFoundException("Token not found");
    }

    await this.prisma.accessToken.delete({ where: { id: tokenId } });
    await this.auditService.log({
      userId,
      action: "token.revoke",
      resourceType: "access_token",
      resourceId: tokenId,
    });
  }
}
