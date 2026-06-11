import { Module } from "@nestjs/common";

import { SvnEngineService } from "./svn-engine.service";
import { SvnMergeService } from "./svn-merge.service";
import { WorkingCopyPoolService } from "./working-copy-pool.service";

@Module({
  providers: [SvnEngineService, WorkingCopyPoolService, SvnMergeService],
  exports: [SvnEngineService, WorkingCopyPoolService, SvnMergeService],
})
export class SvnEngineModule {}
