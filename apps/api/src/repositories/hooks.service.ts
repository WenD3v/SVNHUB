import { chmod, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class HooksService {
  constructor(private readonly configService: ConfigService) {}

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

if [ "$HTTP_CODE" != "200" ]; then
  echo "$BODY" 1>&2
  exit 1
fi

exit 0
`;

    const hookPath = path.join(hooksDir, "pre-commit");
    await writeFile(hookPath, script, { mode: 0o755 });
    await chmod(hookPath, 0o755);
  }
}
