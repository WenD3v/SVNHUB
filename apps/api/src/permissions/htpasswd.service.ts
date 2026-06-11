import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";

import { resolveWorkspacePath } from "../config/workspace-paths";
import { withMutex } from "../common/mutex";
import { ensureApacheSvnFileOwnership } from "../svn-engine/svn-repo-ownership";
import {
  formatHtpasswdLine,
  parseHtpasswd,
  serializeHtpasswd,
} from "./htpasswd.util";

@Injectable()
export class HtpasswdService {
  constructor(private readonly configService: ConfigService) {}

  getPasswdPath(): string {
    return resolveWorkspacePath(
      this.configService.get<string>("SVN_PASSWD_PATH") ?? "data/svn-passwd",
    );
  }

  async upsertUser(username: string, password: string): Promise<void> {
    await withMutex(async () => {
      const entries = await this.readEntries();
      entries.set(username, formatHtpasswdLine(username, password).split(":")[1]!);
      await this.writeEntries(entries);
    });
  }

  async removeUser(username: string): Promise<void> {
    await withMutex(async () => {
      const entries = await this.readEntries();
      entries.delete(username);
      await this.writeEntries(entries);
    });
  }

  private async readEntries(): Promise<Map<string, string>> {
    const passwdPath = this.getPasswdPath();

    try {
      const content = await readFile(passwdPath, "utf8");
      return parseHtpasswd(content);
    } catch {
      return new Map();
    }
  }

  private async writeEntries(entries: Map<string, string>): Promise<void> {
    const passwdPath = this.getPasswdPath();
    await mkdir(resolveWorkspacePath("data"), { recursive: true });
    const tmpPath = `${passwdPath}.tmp`;
    await writeFile(tmpPath, serializeHtpasswd(entries), "utf8");
    await rename(tmpPath, passwdPath);
    await ensureApacheSvnFileOwnership(passwdPath);
  }
}
