import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { SvnEngineModule } from "../svn-engine/svn-engine.module";
import { BackupQueueService } from "./backup-queue.service";
import { BackupsController } from "./backups.controller";
import { BackupsService } from "./backups.service";

@Module({
  imports: [SvnEngineModule, AuditModule],
  controllers: [BackupsController],
  providers: [BackupsService, BackupQueueService],
  exports: [BackupsService],
})
export class BackupsModule {}
