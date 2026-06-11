import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";

import type { AuthenticatedUser } from "../auth/strategies/jwt.strategy";
import { RepoRole } from "../common/decorators/repo-role.decorator";
import {
  CreateIssueCommentDto,
  CreateIssueDto,
  ListIssuesQueryDto,
  UpdateIssueCommentDto,
  UpdateIssueDto,
} from "./dto";
import { IssuesService } from "./issues.service";

@Controller("repositories/:slug/issues")
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Get()
  @RepoRole("READER")
  list(@Param("slug") slug: string, @Query() query: ListIssuesQueryDto) {
    return this.issuesService.list(slug, query);
  }

  @Post()
  @RepoRole("DEVELOPER")
  create(
    @Param("slug") slug: string,
    @Body() dto: CreateIssueDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.issuesService.create(slug, dto, req.user.id);
  }

  @Get(":number")
  @RepoRole("READER")
  getByNumber(@Param("slug") slug: string, @Param("number", ParseIntPipe) number: number) {
    return this.issuesService.getByNumber(slug, number);
  }

  @Patch(":number")
  @RepoRole("DEVELOPER")
  update(
    @Param("slug") slug: string,
    @Param("number", ParseIntPipe) number: number,
    @Body() dto: UpdateIssueDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.issuesService.update(slug, number, dto, req.user.id);
  }

  @Post(":number/comments")
  @RepoRole("DEVELOPER")
  addComment(
    @Param("slug") slug: string,
    @Param("number", ParseIntPipe) number: number,
    @Body() dto: CreateIssueCommentDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.issuesService.addComment(slug, number, dto, req.user.id);
  }

  @Patch(":number/comments/:commentId")
  @RepoRole("DEVELOPER")
  updateComment(
    @Param("slug") slug: string,
    @Param("number", ParseIntPipe) number: number,
    @Param("commentId") commentId: string,
    @Body() dto: UpdateIssueCommentDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.issuesService.updateComment(slug, number, commentId, dto, req.user.id);
  }

  @Delete(":number/comments/:commentId")
  @RepoRole("DEVELOPER")
  removeComment(
    @Param("slug") slug: string,
    @Param("number", ParseIntPipe) number: number,
    @Param("commentId") commentId: string,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.issuesService.removeComment(slug, number, commentId, req.user.id);
  }
}
