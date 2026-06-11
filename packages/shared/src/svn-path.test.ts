import { describe, expect, it } from "vitest";

import {
  DEFAULT_BRANCH_UI,
  svnPathToUiPath,
  svnPathToUiRef,
  uiPathToSvnPath,
  uiRefToSvnPath,
} from "./svn-path.js";

describe("svn-path translation", () => {
  it("maps main branch to /trunk", () => {
    expect(uiRefToSvnPath("main")).toBe("/trunk");
    expect(uiPathToSvnPath("src/app.ts", "main")).toBe("/trunk/src/app.ts");
  });

  it("maps feature branches under /branches", () => {
    expect(uiRefToSvnPath("feature-x")).toBe("/branches/feature-x");
    expect(uiPathToSvnPath("README.md", "feature-x")).toBe("/branches/feature-x/README.md");
  });

  it("maps tags under /tags", () => {
    expect(uiRefToSvnPath("v1.0", "tag")).toBe("/tags/v1.0");
  });

  it("converts svn paths back to ui refs", () => {
    expect(svnPathToUiRef("/trunk")).toEqual({ name: DEFAULT_BRANCH_UI, kind: "branch" });
    expect(svnPathToUiRef("/branches/feature-x/src")).toEqual({
      name: "feature-x",
      kind: "branch",
    });
    expect(svnPathToUiRef("/tags/v1.0")).toEqual({ name: "v1.0", kind: "tag" });
  });

  it("strips branch prefix for file browser paths", () => {
    expect(svnPathToUiPath("/trunk/src/main.ts", "main")).toBe("src/main.ts");
    expect(svnPathToUiPath("/branches/feature-x/docs/readme.md", "feature-x")).toBe(
      "docs/readme.md",
    );
  });
});
