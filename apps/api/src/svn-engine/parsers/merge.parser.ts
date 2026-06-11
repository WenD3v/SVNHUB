export interface MergeDryRunResult {
  changedPaths: string[];
  conflictPaths: string[];
  hasConflicts: boolean;
  rawOutput: string;
}

const CHANGE_LINE = /^([AMDRCGU!?])\s+(.+)$/;
const TWO_COLUMN_CHANGE_LINE = /^\s([AMDRCGU!?])\s+(.+)$/;

export function parseMergeOutput(output: string): MergeDryRunResult {
  const changedPaths: string[] = [];
  const conflictPaths: string[] = [];
  let hasConflicts = false;

  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match =
      trimmed.match(CHANGE_LINE) ?? line.match(TWO_COLUMN_CHANGE_LINE);
    if (match) {
      const action = match[1]!;
      const filePath = match[2]!.trim();
      if (action === "C") {
        hasConflicts = true;
        conflictPaths.push(normalizeMergePath(filePath));
      } else if (action !== "G" && action !== "?" && action !== "!") {
        changedPaths.push(normalizeMergePath(filePath));
      }
      continue;
    }

    if (/conflict/i.test(trimmed)) {
      hasConflicts = true;
    }
  }

  return {
    changedPaths: [...new Set(changedPaths)],
    conflictPaths: [...new Set(conflictPaths)],
    hasConflicts,
    rawOutput: output,
  };
}

export function parseStatusConflicts(statusOutput: string): string[] {
  const conflicts: string[] = [];
  for (const line of statusOutput.split(/\r?\n/)) {
    const trimmed = line.trim();
    const match = trimmed.match(/^C\s+(.+)$/);
    if (match) {
      conflicts.push(normalizeMergePath(match[1]!.trim()));
    }
  }
  return [...new Set(conflicts)];
}

function normalizeMergePath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  if (normalized.startsWith("/")) {
    return normalized;
  }
  return `/${normalized}`;
}
