import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
} from "@nestjs/common";

import type { AuthenticatedUser } from "../auth/strategies/jwt.strategy";
import { RepoRole } from "../common/decorators/repo-role.decorator";
import {
  AddMemberDto,
  UpdateMemberRoleDto,
  UpdatePolicyDto,
  UpsertPathPermissionDto,
} from "../branches/dto";
import { PermissionsService } from "./permissions.service";

@Controller()
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get("repositories/:slug/members")
  @RepoRole("READER")
  listMembers(@Param("slug") slug: string) {
    return this.permissionsService.listMembers(slug);
  }

  @Post("repositories/:slug/members")
  @RepoRole("MAINTAINER")
  addMember(
    @Param("slug") slug: string,
    @Body() dto: AddMemberDto,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    return this.permissionsService.addMember(slug, dto.userId, dto.role, req.user?.id);
  }

  @Patch("repositories/:slug/members/:memberId")
  @RepoRole("MAINTAINER")
  updateMember(
    @Param("slug") slug: string,
    @Param("memberId") memberId: string,
    @Body() dto: UpdateMemberRoleDto,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    return this.permissionsService.updateMemberRole(slug, memberId, dto.role, req.user?.id);
  }

  @Delete("repositories/:slug/members/:memberId")
  @RepoRole("MAINTAINER")
  removeMember(
    @Param("slug") slug: string,
    @Param("memberId") memberId: string,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    return this.permissionsService.removeMember(slug, memberId, req.user?.id);
  }

  @Get("repositories/:slug/permissions")
  @RepoRole("READER")
  listPermissions(@Param("slug") slug: string) {
    return this.permissionsService.listPathPermissions(slug);
  }

  @Put("repositories/:slug/permissions")
  @RepoRole("MAINTAINER")
  upsertPermission(
    @Param("slug") slug: string,
    @Body() dto: UpsertPathPermissionDto,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    return this.permissionsService.upsertPathPermission(slug, dto, req.user?.id);
  }

  @Delete("repositories/:slug/permissions/:permissionId")
  @RepoRole("MAINTAINER")
  deletePermission(
    @Param("slug") slug: string,
    @Param("permissionId") permissionId: string,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    return this.permissionsService.deletePathPermission(slug, permissionId, req.user?.id);
  }

  @Get("repositories/:slug/settings/policies")
  @RepoRole("READER")
  getPolicy(@Param("slug") slug: string) {
    return this.permissionsService.getPolicy(slug);
  }

  @Patch("repositories/:slug/settings/policies")
  @RepoRole("MAINTAINER")
  updatePolicy(
    @Param("slug") slug: string,
    @Body() dto: UpdatePolicyDto,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    return this.permissionsService.updatePolicy(slug, dto, req.user?.id);
  }

  @Get("users")
  listUsers() {
    return this.permissionsService.listUsersForPicker();
  }
}
