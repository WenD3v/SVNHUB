import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { GroupsController, RepoTeamsController, TeamsController } from "./teams.controller";
import { TeamsService } from "./teams.service";

@Module({
  imports: [AuditModule, AuthModule, PermissionsModule],
  controllers: [TeamsController, GroupsController, RepoTeamsController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
