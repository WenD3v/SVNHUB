import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { UsersAdminController } from "./users-admin.controller";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [AuditModule, AuthModule, PermissionsModule],
  controllers: [UsersAdminController, UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
