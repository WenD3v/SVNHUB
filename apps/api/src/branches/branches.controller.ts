import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
} from "@nestjs/common";

import type { AuthenticatedUser } from "../auth/strategies/jwt.strategy";
import { RepoRole } from "../common/decorators/repo-role.decorator";
import {
  AccessTokensService,
  BranchesService,
} from "./branches.service";
import {
  AuditQueryDto,
  CompareBranchesQueryDto,
  CreateAccessTokenDto,
  CreateBranchDto,
  CreateTagDto,
} from "./dto";

@Controller()
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get("repositories/:slug/branches")
  @RepoRole("READER")
  listBranches(@Param("slug") slug: string) {
    return this.branchesService.listBranches(slug);
  }

  @Get("repositories/:slug/tags")
  @RepoRole("READER")
  listTags(@Param("slug") slug: string) {
    return this.branchesService.listTags(slug);
  }

  @Post("repositories/:slug/branches")
  @RepoRole("DEVELOPER")
  createBranch(
    @Param("slug") slug: string,
    @Body() dto: CreateBranchDto,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    return this.branchesService.createBranch(
      slug,
      dto.name,
      dto.sourceRef,
      dto.sourceRevision,
      req.user?.id,
    );
  }

  @Post("repositories/:slug/tags")
  @RepoRole("DEVELOPER")
  createTag(
    @Param("slug") slug: string,
    @Body() dto: CreateTagDto,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    return this.branchesService.createTag(
      slug,
      dto.name,
      dto.sourceRef,
      dto.sourceRevision,
      req.user?.id,
    );
  }

  @Delete("repositories/:slug/branches/:name")
  @RepoRole("DEVELOPER")
  deleteBranch(
    @Param("slug") slug: string,
    @Param("name") name: string,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    return this.branchesService.deleteBranch(slug, name, req.user?.id);
  }

  @Delete("repositories/:slug/tags/:name")
  @RepoRole("DEVELOPER")
  deleteTag(
    @Param("slug") slug: string,
    @Param("name") name: string,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    return this.branchesService.deleteTag(slug, name, req.user?.id);
  }

  @Get("repositories/:slug/compare")
  @RepoRole("READER")
  compare(@Param("slug") slug: string, @Query() query: CompareBranchesQueryDto) {
    return this.branchesService.compareBranches(slug, query.sourceRef, query.targetRef);
  }

  @Get("repositories/:slug/audit-log")
  @RepoRole("MAINTAINER")
  auditLog(@Param("slug") slug: string, @Query() query: AuditQueryDto) {
    return this.branchesService.getAuditLog(slug, query.limit ?? 50, query.offset ?? 0);
  }
}

@Controller("access-tokens")
export class AccessTokensController {
  constructor(private readonly tokensService: AccessTokensService) {}

  @Get()
  list(@Req() req: { user: AuthenticatedUser }) {
    return this.tokensService.list(req.user.id);
  }

  @Post()
  create(@Req() req: { user: AuthenticatedUser }, @Body() dto: CreateAccessTokenDto) {
    return this.tokensService.create(req.user.id, dto.name, dto.scopes, dto.expiresAt);
  }

  @Delete(":id")
  revoke(@Req() req: { user: AuthenticatedUser }, @Param("id") id: string) {
    return this.tokensService.revoke(req.user.id, id);
  }
}
