import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { EmailModule } from "../email/email.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { AvatarService } from "./avatar.service";
import { UserStatsService } from "./user-stats.service";
import { UsersAdminController } from "./users-admin.controller";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [AuditModule, AuthModule, EmailModule, PermissionsModule],
  controllers: [UsersAdminController, UsersController],
  providers: [UsersService, AvatarService, UserStatsService],
  exports: [UsersService, AvatarService, UserStatsService],
})
export class UsersModule {}
