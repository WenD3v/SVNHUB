import { describe, expect, it } from "vitest";

import { validatePreCommit } from "./pre-commit.validator";

const basePolicies = {
  blockTrunkDirectCommit: true,
  blockTagsWrite: true,
  requireCommitMessage: true,
  commitMessageRegex: null,
  maxFileSizeBytes: null,
};

describe("validatePreCommit", () => {
  it("allows valid branch commit", () => {
    const result = validatePreCommit({
      policies: basePolicies,
      logMessage: "feat: add feature",
      changedPaths: [{ path: "/branches/feature-x/README.md", action: "M" }],
    });
    expect(result.allowed).toBe(true);
  });

  it("blocks empty commit message when required", () => {
    const result = validatePreCommit({
      policies: basePolicies,
      logMessage: "   ",
      changedPaths: [{ path: "/branches/feature-x/a.txt", action: "A" }],
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("message");
  });

  it("blocks direct trunk commit", () => {
    const result = validatePreCommit({
      policies: basePolicies,
      logMessage: "fix trunk",
      changedPaths: [{ path: "/trunk/src/main.ts", action: "M" }],
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("trunk");
  });

  it("blocks writes under tags", () => {
    const result = validatePreCommit({
      policies: basePolicies,
      logMessage: "tag fix",
      changedPaths: [{ path: "/tags/v1.0/notes.txt", action: "M" }],
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("/tags");
  });

  it("validates commit message regex", () => {
    const result = validatePreCommit({
      policies: { ...basePolicies, commitMessageRegex: "^\\[SVNHUB-\\d+\\]" },
      logMessage: "wrong format",
      changedPaths: [{ path: "/branches/x/a.txt", action: "A" }],
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("pattern");
  });

  it("blocks oversized files", () => {
    const result = validatePreCommit({
      policies: { ...basePolicies, maxFileSizeBytes: 1024 },
      logMessage: "add big file",
      changedPaths: [{ path: "/branches/x/big.bin", action: "A" }],
      fileSizes: [{ path: "/branches/x/big.bin", sizeBytes: 2048 }],
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("exceeds");
  });
});
