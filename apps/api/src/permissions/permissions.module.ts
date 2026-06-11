import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { AuthzService } from "./authz.service";
import { HtpasswdService } from "./htpasswd.service";
import { GroupsController, PermissionsController } from "./permissions.controller";
import { PermissionsService } from "./permissions.service";

@Module({
  imports: [AuditModule],
  controllers: [PermissionsController, GroupsController],
  providers: [PermissionsService, AuthzService, HtpasswdService],
  exports: [PermissionsService, AuthzService, HtpasswdService],
})
export class PermissionsModule {}
