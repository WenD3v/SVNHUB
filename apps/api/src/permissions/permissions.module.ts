import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { AuthzService } from "./authz.service";
import { HtpasswdService } from "./htpasswd.service";
import { PermissionsController } from "./permissions.controller";
import { PermissionsService } from "./permissions.service";

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [PermissionsController],
  providers: [PermissionsService, AuthzService, HtpasswdService],
  exports: [PermissionsService, AuthzService, HtpasswdService],
})
export class PermissionsModule {}
