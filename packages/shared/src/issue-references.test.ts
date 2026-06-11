import { describe, expect, it } from "vitest";

import {
  parseIssueCloseReferences,
  parseIssueReferences,
  parseRevisionReferences,
} from "./issue-references.js";

describe("parseIssueReferences", () => {
  it("extracts issue numbers from commit messages", () => {
    const message = "Fix login bug (#12) and update docs #34";

    const result = parseIssueReferences(message);

    expect(result).toEqual([12, 34]);
  });

  it("ignores invalid or duplicate references", () => {
    const message = "See #0 and #abc and #5 #5";

    const result = parseIssueReferences(message);

    expect(result).toEqual([5]);
  });
});

describe("parseIssueCloseReferences", () => {
  it("detects fixes and closes keywords", () => {
    const message = "fixes #7\nCloses #9\nresolve: #11";

    const result = parseIssueCloseReferences(message);

    expect(result).toEqual([7, 9, 11]);
  });

  it("returns empty list when no closing keywords are present", () => {
    const message = "Related to #3 and #4";

    const result = parseIssueCloseReferences(message);

    expect(result).toEqual([]);
  });
});

describe("parseRevisionReferences", () => {
  it("extracts revision numbers from text", () => {
    const message = "Follow-up to r42 and r100";

    const result = parseRevisionReferences(message);

    expect(result).toEqual([42, 100]);
  });
});
