import { describe, expect, it } from "vitest";

import { parseMergeOutput, parseStatusConflicts } from "./merge.parser";

describe("parseMergeOutput", () => {
  it("parses changed and conflicted paths", () => {
    const output = [
      "--- Merging r2 through r3 into '.':",
      "U   trunk/app.txt",
      "C   trunk/conflict.txt",
      "A   trunk/new.txt",
    ].join("\n");

    const result = parseMergeOutput(output);

    expect(result.changedPaths).toContain("/trunk/app.txt");
    expect(result.changedPaths).toContain("/trunk/new.txt");
    expect(result.conflictPaths).toContain("/trunk/conflict.txt");
    expect(result.hasConflicts).toBe(true);
  });

  it("parses two-column svn merge status lines", () => {
    const output = " U   trunk/app.txt\n C   trunk/conflict.txt";
    const result = parseMergeOutput(output);
    expect(result.changedPaths).toContain("/trunk/app.txt");
    expect(result.conflictPaths).toContain("/trunk/conflict.txt");
  });
});

describe("parseStatusConflicts", () => {
  it("extracts conflict paths from svn status", () => {
    const status = `
M       trunk/app.txt
C       trunk/conflict.txt
    `;

    expect(parseStatusConflicts(status)).toEqual(["/trunk/conflict.txt"]);
  });
});
