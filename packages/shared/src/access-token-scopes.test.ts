import { describe, expect, it } from "vitest";

import {
  isLegacyPatScopes,
  patHasScope,
  requiredPatScopeForRepoRole,
} from "./access-token-scopes.js";

describe("access-token-scopes", () => {
  it("treats missing token scopes as full session access", () => {
    expect(patHasScope(undefined, "admin")).toBe(true);
    expect(patHasScope(undefined, "repo:write")).toBe(true);
  });

  it("grants all scopes for legacy api tokens", () => {
    expect(isLegacyPatScopes(["api"])).toBe(true);
    expect(patHasScope(["api"], "admin")).toBe(true);
    expect(patHasScope(["api"], "repo:read")).toBe(true);
  });

  it("enforces repo:read and repo:write independently", () => {
    expect(patHasScope(["repo:read"], "repo:read")).toBe(true);
    expect(patHasScope(["repo:read"], "repo:write")).toBe(false);
    expect(patHasScope(["repo:write"], "repo:read")).toBe(true);
    expect(patHasScope(["repo:write"], "repo:write")).toBe(true);
  });

  it("enforces admin scope", () => {
    expect(patHasScope(["repo:write"], "admin")).toBe(false);
    expect(patHasScope(["admin"], "admin")).toBe(true);
  });

  it("maps repository roles to PAT scopes", () => {
    expect(requiredPatScopeForRepoRole("READER")).toBe("repo:read");
    expect(requiredPatScopeForRepoRole("DEVELOPER")).toBe("repo:write");
    expect(requiredPatScopeForRepoRole("MAINTAINER")).toBe("repo:write");
  });
});
