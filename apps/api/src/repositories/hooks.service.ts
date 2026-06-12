import { chmod, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class HooksService implements OnModuleInit {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    try {
      await this.reinstallAllHooks();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[hooks] Failed to reinstall hooks on startup: ${message}`);
    }
  }

  async reinstallAllHooks(): Promise<void> {
    const repositories = await this.prisma.repository.findMany({
      select: { id: true, svnPath: true },
    });

    await Promise.all(
      repositories.map((repository) =>
        this.installHooks(repository.svnPath, repository.id),
      ),
    );
  }

  async installHooks(repoPath: string, repositoryId: string): Promise<void> {
    await Promise.all([
      this.installPostCommitHook(repoPath, repositoryId),
      this.installPreCommitHook(repoPath, repositoryId),
    ]);
  }

  async installPostCommitHook(repoPath: string, repositoryId: string): Promise<void> {
    const hooksDir = path.join(repoPath, "hooks");
    await mkdir(hooksDir, { recursive: true });

    const apiUrl = this.configService.get<string>("API_INTERNAL_URL") ?? "http://localhost:4000";
    const secret = this.configService.get<string>("INTERNAL_HOOK_SECRET") ?? "change-me-hook-secret";

    const script = `#!/bin/sh
REPOS="$1"
REV="$2"
curl -sS -X POST "${apiUrl}/internal/repositories/${repositoryId}/index-revision" \\
  -H "Content-Type: application/json" \\
  -H "X-Hook-Secret: ${secret}" \\
  -d "{\\"revision\\": $REV}" > /dev/null 2>&1 &
exit 0
`;

    const hookPath = path.join(hooksDir, "post-commit");
    await writeFile(hookPath, script, { mode: 0o755 });
    await chmod(hookPath, 0o755);
  }

  async installPreCommitHook(repoPath: string, repositoryId: string): Promise<void> {
    const hooksDir = path.join(repoPath, "hooks");
    await mkdir(hooksDir, { recursive: true });

    const apiUrl = this.configService.get<string>("API_INTERNAL_URL") ?? "http://localhost:4000";
    const secret = this.configService.get<string>("INTERNAL_HOOK_SECRET") ?? "change-me-hook-secret";

    const script = `#!/bin/sh
REPOS="$1"
TXN="$2"

RESPONSE=$(curl -sS -w "\\n%{http_code}" -X POST "${apiUrl}/internal/repositories/${repositoryId}/validate-pre-commit" \\
  -H "Content-Type: application/json" \\
  -H "X-Hook-Secret: ${secret}" \\
  -d "{\\"txn\\": \\"$TXN\\"}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

case "$HTTP_CODE" in
  2??) exit 0 ;;
esac

REASON=$(echo "$BODY" | sed -n 's/.*"message":"\\([^"]*\\)".*/\\1/p')
if [ -n "$REASON" ]; then
  echo "SVNHUB: $REASON" 1>&2
else
  echo "$BODY" 1>&2
fi
exit 1
`;

    const hookPath = path.join(hooksDir, "pre-commit");
    await writeFile(hookPath, script, { mode: 0o755 });
    await chmod(hookPath, 0o755);
  }
}
