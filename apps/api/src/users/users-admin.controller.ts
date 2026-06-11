import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { AdminUserEntry, AdminUsersListResponse } from "@svnhub/shared";

import { AdminGuard } from "../auth/guards/admin.guard";
import type { AuthenticatedUser } from "../auth/strategies/jwt.strategy";
import {
  CreateAdminUserDto,
  ListAdminUsersQueryDto,
  ResetAdminUserPasswordDto,
  UpdateAdminUserDto,
} from "./dto/users.dto";
import { UsersService } from "./users.service";

@Controller("admin/users")
@UseGuards(AdminGuard)
export class UsersAdminController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(@Query() query: ListAdminUsersQueryDto): Promise<AdminUsersListResponse> {
    return this.usersService.listAdmin({
      search: query.search,
      status: query.status,
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Post()
  create(
    @Body() dto: CreateAdminUserDto,
    @Req() req: { user?: AuthenticatedUser; ip?: string },
  ): Promise<AdminUserEntry> {
    return this.usersService.createAdmin(dto, req.user!.id, req.ip);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateAdminUserDto,
    @Req() req: { user?: AuthenticatedUser; ip?: string },
  ): Promise<AdminUserEntry> {
    return this.usersService.updateAdmin(id, dto, req.user!.id, req.ip);
  }

  @Post(":id/reset-password")
  resetPassword(
    @Param("id") id: string,
    @Body() dto: ResetAdminUserPasswordDto,
    @Req() req: { user?: AuthenticatedUser; ip?: string },
  ): Promise<AdminUserEntry> {
    return this.usersService.resetPasswordAdmin(id, dto, req.user!.id, req.ip);
  }
}
