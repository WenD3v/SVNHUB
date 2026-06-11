import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";

import { InternalHookGuard } from "../auth/guards/internal-hook.guard";
import { BranchesService } from "../branches/branches.service";
import { ValidatePreCommitDto } from "../branches/dto";
import { Public } from "../common/decorators/public.decorator";
import { IndexRevisionDto } from "./dto/index-revision.dto";
import { RepositoriesService } from "./repositories.service";

@Public()
@UseGuards(InternalHookGuard)
@Controller("internal/repositories")
export class InternalRepositoriesController {
  constructor(
    private readonly repositoriesService: RepositoriesService,
    private readonly branchesService: BranchesService,
  ) {}

  @Post(":id/index-revision")
  indexRevision(@Param("id") id: string, @Body() dto: IndexRevisionDto) {
    return this.repositoriesService.indexRevision(id, dto.revision);
  }

  @Post(":id/validate-pre-commit")
  @HttpCode(HttpStatus.OK)
  async validatePreCommit(@Param("id") id: string, @Body() dto: ValidatePreCommitDto) {
    const result = await this.branchesService.validatePreCommitHook(id, dto.txn);
    if (!result.allowed) {
      throw new ForbiddenException(result.reason ?? "Commit rejected by policy");
    }
    return { ok: true };
  }
}
