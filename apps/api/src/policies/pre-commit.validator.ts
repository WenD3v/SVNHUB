import type { SvnChangeAction } from "@svnhub/shared";

export interface PreCommitChangedPath {
  path: string;
  action: SvnChangeAction;
}

export interface PreCommitFileSize {
  path: string;
  sizeBytes: number;
}

export interface PreCommitValidationInput {
  policies: {
    blockTrunkDirectCommit: boolean;
    blockTagsWrite: boolean;
    requireCommitMessage: boolean;
    commitMessageRegex: string | null;
    maxFileSizeBytes: number | null;
  };
  logMessage: string;
  changedPaths: PreCommitChangedPath[];
  fileSizes?: PreCommitFileSize[];
}

export interface PreCommitValidationResult {
  allowed: boolean;
  reason?: string;
}

function normalizePath(path: string): string {
  if (!path.startsWith("/")) {
    return `/${path}`;
  }
  return path.replace(/\/+$/, "") || "/";
}

export function validatePreCommit(input: PreCommitValidationInput): PreCommitValidationResult {
  const { policies, logMessage, changedPaths, fileSizes = [] } = input;
  const trimmedMessage = logMessage.trim();

  if (policies.requireCommitMessage && !trimmedMessage) {
    return { allowed: false, reason: "Commit message is required" };
  }

  if (policies.commitMessageRegex) {
    try {
      const regex = new RegExp(policies.commitMessageRegex);
      if (!regex.test(trimmedMessage)) {
        return {
          allowed: false,
          reason: "Commit message does not match the required pattern",
        };
      }
    } catch {
      return { allowed: false, reason: "Invalid commit message regex configured" };
    }
  }

  for (const change of changedPaths) {
    const path = normalizePath(change.path);

    if (policies.blockTrunkDirectCommit && isTrunkWrite(path, change.action)) {
      return {
        allowed: false,
        reason: "Direct commits to main (/trunk) are not allowed",
      };
    }

    if (policies.blockTagsWrite && isTagsWrite(path, change.action)) {
      return {
        allowed: false,
        reason: "Writes under /tags are not allowed",
      };
    }
  }

  if (policies.maxFileSizeBytes !== null && policies.maxFileSizeBytes > 0) {
    for (const file of fileSizes) {
      if (file.sizeBytes > policies.maxFileSizeBytes) {
        return {
          allowed: false,
          reason: `File ${file.path} exceeds maximum size of ${policies.maxFileSizeBytes} bytes`,
        };
      }
    }
  }

  return { allowed: true };
}

function isTrunkWrite(path: string, action: SvnChangeAction): boolean {
  if (action === "D") {
    return path === "/trunk" || path.startsWith("/trunk/");
  }
  return path === "/trunk" || path.startsWith("/trunk/");
}

function isTagsWrite(path: string, action: SvnChangeAction): boolean {
  if (action === "D") {
    return path === "/tags" || path.startsWith("/tags/");
  }
  return path === "/tags" || path.startsWith("/tags/");
}
