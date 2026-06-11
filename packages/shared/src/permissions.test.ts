import { describe, expect, it } from "vitest";

import type { RepoPolicySettings } from "./permissions.js";

describe("RepoPolicySettings shape", () => {
  it("accepts default policy fields", () => {
    const policy: RepoPolicySettings = {
      blockTrunkDirectCommit: true,
      blockTagsWrite: true,
      requireCommitMessage: true,
      commitMessageRegex: null,
      maxFileSizeBytes: null,
      minApprovals: 1,
    };
    expect(policy.blockTrunkDirectCommit).toBe(true);
  });
});
