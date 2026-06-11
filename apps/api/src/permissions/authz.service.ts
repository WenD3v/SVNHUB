import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { resolveWorkspacePath } from "../config/workspace-paths";
import { withMutex } from "../common/mutex";
import { ensureApacheSvnFileOwnership } from "../svn-engine/svn-repo-ownership";
import { PrismaService } from "../prisma/prisma.service";
import {
  compileAuthz,
  formatPrincipal,
  pathAccessToAuthz,
  repoRoleDefaultAccess,
  type AuthzRepoSection,
} from "./authz.compiler";

@Injectable()
export class AuthzService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    await this.rebuildAll();
  }

  async rebuildAll(): Promise<void> {
    await withMutex(async () => {
      const content = await this.compileAll();
      const authzPath = this.getAuthzPath();
      await mkdir(path.dirname(authzPath), { recursive: true });
      const tmpPath = `${authzPath}.tmp`;
      await writeFile(tmpPath, content, "utf8");
      await rename(tmpPath, authzPath);
      await ensureApacheSvnFileOwnership(authzPath);
    });
  }

  private getAuthzPath(): string {
    return resolveWorkspacePath(
      this.configService.get<string>("SVN_AUTHZ_PATH") ?? "data/svn-authz",
    );
  }

  private async compileAll(): Promise<string> {
    const groups = await this.prisma.group.findMany({
      include: { members: { include: { user: { select: { username: true } } } } },
    });

    const repositories = await this.prisma.repository.findMany({
      include: {
        members: { include: { user: { select: { username: true } } } },
        repoTeams: { include: { group: { select: { name: true } } } },
        pathPermissions: true,
      },
    });

    const admins = await this.prisma.user.findMany({
      where: { isAdmin: true },
      select: { username: true },
    });

    const userIds = new Set<string>();
    for (const repo of repositories) {
      for (const permission of repo.pathPermissions) {
        if (permission.principalType === "USER") {
          userIds.add(permission.principalId);
        }
      }
    }
    const users = await this.prisma.user.findMany({
      where: { id: { in: Array.from(userIds) } },
      select: { id: true, username: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u.username]));
    const groupMap = new Map(groups.map((g) => [g.id, g.name]));

    const authzGroups = groups.map((group) => ({
      name: group.name,
      members: group.members.map((member) => member.user.username),
    }));

    const authzRepos: AuthzRepoSection[] = repositories.map((repo) => {
      const rulesMap = new Map<string, Array<{ principal: string; access: "r" | "rw" | "" }>>();

      const addRule = (svnPath: string, principal: string, access: "r" | "rw" | "") => {
        const normalized = svnPath === "" ? "/" : svnPath.startsWith("/") ? svnPath : `/${svnPath}`;
        const existing = rulesMap.get(normalized) ?? [];
        existing.push({ principal, access });
        rulesMap.set(normalized, existing);
      };

      for (const admin of admins) {
        addRule("/", admin.username, "rw");
      }

      for (const member of repo.members) {
        addRule("/", member.user.username, repoRoleDefaultAccess(member.role));
      }

      for (const repoTeam of repo.repoTeams) {
        addRule(
          "/",
          formatPrincipal("GROUP", repoTeam.group.name),
          repoRoleDefaultAccess(repoTeam.role),
        );
      }

      for (const permission of repo.pathPermissions) {
        if (permission.access === "NONE") continue;

        const principalName =
          permission.principalType === "GROUP"
            ? groupMap.get(permission.principalId)
            : userMap.get(permission.principalId);

        if (!principalName) continue;

        addRule(
          permission.path,
          formatPrincipal(permission.principalType, principalName),
          pathAccessToAuthz(permission.access),
        );
      }

      addRule("/tags", "*", "r");

      return {
        repoSlug: repo.slug,
        rules: Array.from(rulesMap.entries()).map(([rulePath, entries]) => ({
          path: rulePath,
          entries,
        })),
      };
    });

    return compileAuthz({ groups: authzGroups, repos: authzRepos });
  }
}
