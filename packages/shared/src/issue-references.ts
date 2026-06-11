const ISSUE_REFERENCE_PATTERN = /(?:^|[\s(])#(\d+)(?=[\s),.:;!?]|$)/g;

const ISSUE_CLOSE_PATTERN =
  /\b(?:fix(?:es)?|close(?:s)?|resolve(?:s)?)(?:\s+\w+)?:?\s+#(\d+)/gi;

export function parseIssueReferences(text: string): number[] {
  const numbers = new Set<number>();
  for (const match of text.matchAll(ISSUE_REFERENCE_PATTERN)) {
    const issueNumber = Number.parseInt(match[1] ?? "", 10);
    if (Number.isFinite(issueNumber) && issueNumber > 0) {
      numbers.add(issueNumber);
    }
  }
  return [...numbers].sort((left, right) => left - right);
}

export function parseIssueCloseReferences(text: string): number[] {
  const numbers = new Set<number>();
  for (const match of text.matchAll(ISSUE_CLOSE_PATTERN)) {
    const issueNumber = Number.parseInt(match[1] ?? "", 10);
    if (Number.isFinite(issueNumber) && issueNumber > 0) {
      numbers.add(issueNumber);
    }
  }
  return [...numbers].sort((left, right) => left - right);
}

export function parseRevisionReferences(text: string): number[] {
  const numbers = new Set<number>();
  const revisionPattern = /(?:^|[\s(])r(\d+)(?=[\s),.:;!?]|$)/gi;
  for (const match of text.matchAll(revisionPattern)) {
    const revision = Number.parseInt(match[1] ?? "", 10);
    if (Number.isFinite(revision) && revision > 0) {
      numbers.add(revision);
    }
  }
  return [...numbers].sort((left, right) => left - right);
}
