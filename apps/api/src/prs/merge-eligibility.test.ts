import { describe, expect, it } from "vitest";

import {
  countApprovals,
  evaluateMergeEligibility,
  latestReviewDecisions,
} from "./merge-eligibility";

describe("evaluateMergeEligibility", () => {
  it("allows merge when all conditions are met", () => {
    const result = evaluateMergeEligibility({
      status: "OPEN",
      hasConflicts: false,
      approvalCount: 2,
      minApprovals: 1,
      latestReviewDecisions: ["APPROVED"],
      statusChecks: [],
    });

    expect(result.canMerge).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it("blocks merge when PR is not open", () => {
    const result = evaluateMergeEligibility({
      status: "CLOSED",
      hasConflicts: false,
      approvalCount: 2,
      minApprovals: 1,
      latestReviewDecisions: ["APPROVED"],
      statusChecks: [],
    });

    expect(result.canMerge).toBe(false);
    expect(result.reasons).toContain("Pull request is not open");
  });

  it("blocks merge on conflicts", () => {
    const result = evaluateMergeEligibility({
      status: "OPEN",
      hasConflicts: true,
      approvalCount: 2,
      minApprovals: 1,
      latestReviewDecisions: ["APPROVED"],
      statusChecks: [],
    });

    expect(result.canMerge).toBe(false);
    expect(result.reasons).toContain("Merge conflicts detected");
  });

  it("blocks merge on insufficient approvals", () => {
    const result = evaluateMergeEligibility({
      status: "OPEN",
      hasConflicts: false,
      approvalCount: 0,
      minApprovals: 2,
      latestReviewDecisions: [],
      statusChecks: [],
    });

    expect(result.canMerge).toBe(false);
    expect(result.reasons[0]).toContain("Insufficient approvals");
  });

  it("blocks merge when changes were requested", () => {
    const result = evaluateMergeEligibility({
      status: "OPEN",
      hasConflicts: false,
      approvalCount: 1,
      minApprovals: 1,
      latestReviewDecisions: ["CHANGES_REQUESTED"],
      statusChecks: [],
    });

    expect(result.canMerge).toBe(false);
    expect(result.reasons).toContain("Changes have been requested");
  });

  it("blocks merge on failed status checks", () => {
    const result = evaluateMergeEligibility({
      status: "OPEN",
      hasConflicts: false,
      approvalCount: 1,
      minApprovals: 1,
      latestReviewDecisions: ["APPROVED"],
      statusChecks: [{ status: "FAILURE" }],
    });

    expect(result.canMerge).toBe(false);
    expect(result.reasons).toContain("Status checks failed");
  });

  it("does not block merge on pending status checks", () => {
    const result = evaluateMergeEligibility({
      status: "OPEN",
      hasConflicts: false,
      approvalCount: 1,
      minApprovals: 1,
      latestReviewDecisions: ["APPROVED"],
      statusChecks: [{ status: "PENDING" }],
    });

    expect(result.canMerge).toBe(true);
  });

  it("does not block merge when no status checks are configured", () => {
    const result = evaluateMergeEligibility({
      status: "OPEN",
      hasConflicts: false,
      approvalCount: 1,
      minApprovals: 1,
      latestReviewDecisions: ["APPROVED"],
      statusChecks: [],
    });

    expect(result.canMerge).toBe(true);
  });
});

describe("countApprovals", () => {
  it("counts only latest approved reviews per author", () => {
    const count = countApprovals([
      { authorId: "u1", decision: "APPROVED" },
      { authorId: "u2", decision: "CHANGES_REQUESTED" },
      { authorId: "u2", decision: "APPROVED" },
    ]);

    expect(count).toBe(2);
  });
});

describe("latestReviewDecisions", () => {
  it("returns the most recent decision per reviewer", () => {
    const decisions = latestReviewDecisions([
      {
        authorId: "u1",
        decision: "CHANGES_REQUESTED",
        updatedAt: new Date("2026-01-01"),
      },
      {
        authorId: "u1",
        decision: "APPROVED",
        updatedAt: new Date("2026-01-02"),
      },
    ]);

    expect(decisions).toEqual(["APPROVED"]);
  });
});
