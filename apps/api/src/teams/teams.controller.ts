import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";

import type { AuthenticatedUser } from "../auth/strategies/jwt.strategy";
import { AdminGuard } from "../auth/guards/admin.guard";
import { RepoRole } from "../common/decorators/repo-role.decorator";
import { TeamsService } from "./teams.service";
import {
  AddTeamMemberDto,
  CreateTeamDto,
  LinkRepoTeamDto,
  UpdateRepoTeamDto,
  UpdateTeamDto,
} from "./dto";

@Controller("teams")
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  list() {
    return this.teamsService.list();
  }

  @Get(":slug")
  get(@Param("slug") slug: string) {
    return this.teamsService.getBySlug(slug);
  }

  @Post()
  @UseGuards(AdminGuard)
  create(@Body() dto: CreateTeamDto, @Req() req: { user?: AuthenticatedUser }) {
    return this.teamsService.create(dto.name, dto.description, req.user?.id);
  }

  @Patch(":slug")
  @UseGuards(AdminGuard)
  update(
    @Param("slug") slug: string,
    @Body() dto: UpdateTeamDto,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    return this.teamsService.updateBySlug(slug, dto, req.user?.id);
  }

  @Delete(":slug")
  @UseGuards(AdminGuard)
  remove(@Param("slug") slug: string, @Req() req: { user?: AuthenticatedUser }) {
    return this.teamsService.deleteBySlug(slug, req.user?.id);
  }

  @Post(":slug/members")
  addMember(
    @Param("slug") slug: string,
    @Body() dto: AddTeamMemberDto,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    return this.teamsService.addMember(slug, dto.userId, dto.role, req.user?.id);
  }

  @Delete(":slug/members/:memberId")
  removeMember(
    @Param("slug") slug: string,
    @Param("memberId") memberId: string,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    return this.teamsService.removeMember(slug, memberId, req.user?.id);
  }
}

@Controller("groups")
export class GroupsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  async list() {
    const teams = await this.teamsService.list();
    return teams.map(({ id, slug, name, description, memberCount }) => ({
      id,
      slug,
      name,
      description,
      memberCount,
    }));
  }

  @Get(":id")
  async get(@Param("id") id: string) {
    const team = await this.teamsService.getById(id);
    return {
      id: team.id,
      slug: team.slug,
      name: team.name,
      description: team.description,
      memberCount: team.memberCount,
      members: team.members,
    };
  }

  @Post()
  @UseGuards(AdminGuard)
  create(@Body() dto: CreateTeamDto, @Req() req: { user?: AuthenticatedUser }) {
    return this.teamsService.create(dto.name, dto.description, req.user?.id);
  }

  @Patch(":id")
  @UseGuards(AdminGuard)
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateTeamDto,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    const team = await this.teamsService.getById(id);
    return this.teamsService.updateBySlug(team.slug, dto, req.user?.id);
  }

  @Delete(":id")
  @UseGuards(AdminGuard)
  async remove(@Param("id") id: string, @Req() req: { user?: AuthenticatedUser }) {
    const team = await this.teamsService.getById(id);
    await this.teamsService.deleteBySlug(team.slug, req.user?.id);
  }

  @Post(":id/members")
  @UseGuards(AdminGuard)
  async addMember(
    @Param("id") id: string,
    @Body() dto: AddTeamMemberDto,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    const team = await this.teamsService.getById(id);
    return this.teamsService.addMember(team.slug, dto.userId, dto.role, req.user?.id);
  }

  @Delete(":id/members/:memberId")
  @UseGuards(AdminGuard)
  async removeMember(
    @Param("id") id: string,
    @Param("memberId") memberId: string,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    const team = await this.teamsService.getById(id);
    await this.teamsService.removeMember(team.slug, memberId, req.user?.id);
  }
}

@Controller()
export class RepoTeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get("repositories/:slug/teams")
  @RepoRole("READER")
  list(@Param("slug") slug: string) {
    return this.teamsService.listRepoTeams(slug);
  }

  @Post("repositories/:slug/teams")
  @RepoRole("MAINTAINER")
  link(
    @Param("slug") slug: string,
    @Body() dto: LinkRepoTeamDto,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    return this.teamsService.linkRepoTeam(slug, dto, req.user?.id);
  }

  @Patch("repositories/:slug/teams/:teamSlug")
  @RepoRole("MAINTAINER")
  update(
    @Param("slug") slug: string,
    @Param("teamSlug") teamSlug: string,
    @Body() dto: UpdateRepoTeamDto,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    return this.teamsService.updateRepoTeam(slug, teamSlug, dto, req.user?.id);
  }

  @Delete("repositories/:slug/teams/:teamSlug")
  @RepoRole("MAINTAINER")
  unlink(
    @Param("slug") slug: string,
    @Param("teamSlug") teamSlug: string,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    return this.teamsService.unlinkRepoTeam(slug, teamSlug, req.user?.id);
  }
}
