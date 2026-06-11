import { Module } from "@nestjs/common";

import { BackupsModule } from "../backups/backups.module";
import { BranchesModule } from "../branches/branches.module";
import { PipelinesModule } from "../pipelines/pipelines.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { SvnEngineModule } from "../svn-engine/svn-engine.module";
import { WebhooksModule } from "../webhooks/webhooks.module";
import { ChangelogService } from "./changelog.service";
import { InternalRepositoriesController } from "./internal.controller";
import { HooksService } from "./hooks.service";
import { RepositoriesController } from "./repositories.controller";
import { RepositoriesService } from "./repositories.service";
import { RevisionIndexService } from "./revision-index.service";
import { StatsService } from "./stats.service";

@Module({
  imports: [SvnEngineModule, BackupsModule, BranchesModule, PermissionsModule, PipelinesModule, WebhooksModule],
  controllers: [RepositoriesController, InternalRepositoriesController],
  providers: [RepositoriesService, RevisionIndexService, HooksService, StatsService, ChangelogService],
  exports: [RepositoriesService],
})
export class RepositoriesModule {}
