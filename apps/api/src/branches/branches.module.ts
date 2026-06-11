import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { SvnEngineModule } from "../svn-engine/svn-engine.module";
import {
  AccessTokensController,
  BranchesController,
} from "./branches.controller";
import { AccessTokensService, BranchesService } from "./branches.service";

@Module({
  imports: [SvnEngineModule, AuditModule, AuthModule],
  controllers: [BranchesController, AccessTokensController],
  providers: [BranchesService, AccessTokensService],
  exports: [BranchesService],
})
export class BranchesModule {}
