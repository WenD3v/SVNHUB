import type { PRReviewDecision, PRStatusCheckStatus, PullRequestStatus } from "@svnhub/shared";

export interface MergeEligibilityInput {
  status: PullRequestStatus;
  hasConflicts: boolean;
  approvalCount: number;
  minApprovals: number;
  latestReviewDecisions: PRReviewDecision[];
  statusChecks: Array<{ status: PRStatusCheckStatus }>;
}

export interface MergeEligibilityResult {
  canMerge: boolean;
  reasons: string[];
  approvalCount: number;
  minApprovals: number;
  hasConflicts: boolean;
}

export function evaluateMergeEligibility(
  input: MergeEligibilityInput,
): MergeEligibilityResult {
  const reasons: string[] = [];

  if (input.status !== "OPEN") {
    reasons.push("Pull request is not open");
  }

  if (input.hasConflicts) {
    reasons.push("Merge conflicts detected");
  }

  if (input.approvalCount < input.minApprovals) {
    reasons.push(
      `Insufficient approvals (${input.approvalCount}/${input.minApprovals})`,
    );
  }

  const hasChangesRequested = input.latestReviewDecisions.some(
    (decision) => decision === "CHANGES_REQUESTED",
  );
  if (hasChangesRequested) {
    reasons.push("Changes have been requested");
  }

  if (input.statusChecks.length > 0) {
    const hasFailure = input.statusChecks.some((check) => check.status === "FAILURE");
    if (hasFailure) {
      reasons.push("Status checks failed");
    }
  }

  return {
    canMerge: reasons.length === 0,
    reasons,
    approvalCount: input.approvalCount,
    minApprovals: input.minApprovals,
    hasConflicts: input.hasConflicts,
  };
}

export function countApprovals(reviews: Array<{ decision: PRReviewDecision; authorId: string }>): number {
  const latestByAuthor = new Map<string, PRReviewDecision>();
  for (const review of reviews) {
    latestByAuthor.set(review.authorId, review.decision);
  }
  return [...latestByAuthor.values()].filter((decision) => decision === "APPROVED").length;
}

export function latestReviewDecisions(
  reviews: Array<{ decision: PRReviewDecision; authorId: string; updatedAt: Date }>,
): PRReviewDecision[] {
  const latestByAuthor = new Map<string, { decision: PRReviewDecision; updatedAt: Date }>();
  for (const review of reviews) {
    const existing = latestByAuthor.get(review.authorId);
    if (!existing || review.updatedAt >= existing.updatedAt) {
      latestByAuthor.set(review.authorId, {
        decision: review.decision,
        updatedAt: review.updatedAt,
      });
    }
  }
  return [...latestByAuthor.values()].map((entry) => entry.decision);
}
