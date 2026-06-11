import { Controller, Get, Query, Req } from "@nestjs/common";
import type { SearchResponse } from "@svnhub/shared";

import type { AuthenticatedUser } from "../auth/strategies/jwt.strategy";
import { SearchQueryDto } from "./dto/search-query.dto";
import { SearchService } from "./search.service";

@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(
    @Req() req: { user: AuthenticatedUser },
    @Query() query: SearchQueryDto,
  ): Promise<SearchResponse> {
    return this.searchService.search(req.user.id, query.q);
  }
}
