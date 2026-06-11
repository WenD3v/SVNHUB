import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from "@nestjs/common";

import type { AuthenticatedUser } from "../auth/strategies/jwt.strategy";
import { RepoRole } from "../common/decorators/repo-role.decorator";
import { CreateLabelDto, UpdateLabelDto } from "./dto";
import { LabelsService } from "./issues.service";

@Controller("repositories/:slug/labels")
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @Get()
  @RepoRole("READER")
  list(@Param("slug") slug: string) {
    return this.labelsService.list(slug);
  }

  @Post()
  @RepoRole("MAINTAINER")
  create(
    @Param("slug") slug: string,
    @Body() dto: CreateLabelDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.labelsService.create(slug, dto, req.user.id);
  }

  @Patch(":labelId")
  @RepoRole("MAINTAINER")
  update(
    @Param("slug") slug: string,
    @Param("labelId") labelId: string,
    @Body() dto: UpdateLabelDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.labelsService.update(slug, labelId, dto, req.user.id);
  }

  @Delete(":labelId")
  @RepoRole("MAINTAINER")
  remove(
    @Param("slug") slug: string,
    @Param("labelId") labelId: string,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.labelsService.remove(slug, labelId, req.user.id);
  }
}
