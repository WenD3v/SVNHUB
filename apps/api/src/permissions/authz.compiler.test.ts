import { describe, expect, it } from "vitest";

import {
  compileAuthz,
  formatPrincipal,
  pathAccessToAuthz,
  repoRoleDefaultAccess,
} from "./authz.compiler";

describe("compileAuthz", () => {
  it("produces exact authz file output", () => {
    const output = compileAuthz({
      groups: [
        { name: "developers", members: ["alice", "bob"] },
        { name: "owners", members: ["alice"] },
      ],
      repos: [
        {
          repoSlug: "demo-repo",
          rules: [
            {
              path: "/",
              entries: [
                { principal: "@owners", access: "rw" },
                { principal: "*", access: "r" },
              ],
            },
            {
              path: "/trunk",
              entries: [
                { principal: "@developers", access: "rw" },
                { principal: "*", access: "r" },
              ],
            },
            {
              path: "/tags",
              entries: [{ principal: "*", access: "r" }],
            },
          ],
        },
      ],
    });

    const withoutTimestamp = output
      .split("\n")
      .filter((line) => !line.startsWith("# "))
      .join("\n")
      .trim();

    expect(withoutTimestamp).toBe(`[groups]
developers = alice, bob
owners = alice

[demo-repo:/]
@owners = rw
* = r

[demo-repo:/trunk]
@developers = rw
* = r

[demo-repo:/tags]
* = r`);
  });

  it("includes RepoTeam default access by role on repository root", () => {
    const output = compileAuthz({
      groups: [{ name: "platform", members: ["carol"] }],
      repos: [
        {
          repoSlug: "api-repo",
          rules: [
            {
              path: "/",
              entries: [
                { principal: "@platform", access: "rw" },
                { principal: "carol", access: "r" },
              ],
            },
            {
              path: "/tags",
              entries: [{ principal: "*", access: "r" }],
            },
          ],
        },
      ],
    });

    const withoutTimestamp = output
      .split("\n")
      .filter((line) => !line.startsWith("# "))
      .join("\n")
      .trim();

    expect(withoutTimestamp).toContain("[api-repo:/]\n@platform = rw");
    expect(repoRoleDefaultAccess("MAINTAINER")).toBe("rw");
    expect(repoRoleDefaultAccess("READER")).toBe("r");
  });
});

describe("pathAccessToAuthz", () => {
  it("maps access levels", () => {
    expect(pathAccessToAuthz("READ")).toBe("r");
    expect(pathAccessToAuthz("WRITE")).toBe("rw");
    expect(pathAccessToAuthz("NONE")).toBe("");
  });
});

describe("repoRoleDefaultAccess", () => {
  it("maps roles", () => {
    expect(repoRoleDefaultAccess("OWNER")).toBe("rw");
    expect(repoRoleDefaultAccess("READER")).toBe("r");
  });
});

describe("formatPrincipal", () => {
  it("prefixes groups with @", () => {
    expect(formatPrincipal("GROUP", "developers")).toBe("@developers");
    expect(formatPrincipal("USER", "alice")).toBe("alice");
  });
});
