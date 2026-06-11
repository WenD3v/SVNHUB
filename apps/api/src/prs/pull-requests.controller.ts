import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import type { AuthenticatedUser } from "../auth/strategies/jwt.strategy";
import {
  CreatePRCommentDto,
  CreatePRReviewDto,
  CreatePullRequestDto,
  ListPullRequestsQueryDto,
  MergePullRequestDto,
  UpdatePullRequestDto,
} from "./dto";
import { PullRequestsService } from "./pull-requests.service";

@Controller("repositories/:slug/pull-requests")
export class PullRequestsController {
  constructor(private readonly pullRequestsService: PullRequestsService) {}

  @Get()
  list(@Param("slug") slug: string, @Query() query: ListPullRequestsQueryDto) {
    return this.pullRequestsService.list(slug, query.status);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Param("slug") slug: string,
    @Body() dto: CreatePullRequestDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.pullRequestsService.create(slug, dto, req.user.id);
  }

  @Get(":number")
  getByNumber(@Param("slug") slug: string, @Param("number", ParseIntPipe) number: number) {
    return this.pullRequestsService.getByNumber(slug, number);
  }

  @Get(":number/preview")
  preview(@Param("slug") slug: string, @Param("number", ParseIntPipe) number: number) {
    return this.pullRequestsService.previewMerge(slug, number);
  }

  @Get(":number/commits")
  commits(@Param("slug") slug: string, @Param("number", ParseIntPipe) number: number) {
    return this.pullRequestsService.getCommits(slug, number);
  }

  @Post(":number/comments")
  @UseGuards(JwtAuthGuard)
  addComment(
    @Param("slug") slug: string,
    @Param("number", ParseIntPipe) number: number,
    @Body() dto: CreatePRCommentDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.pullRequestsService.addComment(slug, number, dto, req.user.id);
  }

  @Post(":number/reviews")
  @UseGuards(JwtAuthGuard)
  addReview(
    @Param("slug") slug: string,
    @Param("number", ParseIntPipe) number: number,
    @Body() dto: CreatePRReviewDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.pullRequestsService.addReview(slug, number, dto, req.user.id);
  }

  @Post(":number/merge")
  @UseGuards(JwtAuthGuard)
  merge(
    @Param("slug") slug: string,
    @Param("number", ParseIntPipe) number: number,
    @Body() dto: MergePullRequestDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.pullRequestsService.merge(
      slug,
      number,
      req.user.id,
      dto.deleteSourceBranch ?? false,
    );
  }

  @Patch(":number")
  @UseGuards(JwtAuthGuard)
  updateStatus(
    @Param("slug") slug: string,
    @Param("number", ParseIntPipe) number: number,
    @Body() dto: UpdatePullRequestDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.pullRequestsService.updateStatus(slug, number, dto.status, req.user.id);
  }
}
