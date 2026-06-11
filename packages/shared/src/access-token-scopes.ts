export const PAT_SCOPES = ["repo:read", "repo:write", "admin"] as const;

export type PatScope = (typeof PAT_SCOPES)[number];

/** Legacy tokens created before scope enforcement. */
export const LEGACY_PAT_SCOPE = "api";

export function isLegacyPatScopes(scopes: string[]): boolean {
  return scopes.includes(LEGACY_PAT_SCOPE);
}

export function patHasScope(
  tokenScopes: string[] | undefined,
  required: PatScope,
): boolean {
  if (!tokenScopes) {
    return true;
  }
  if (isLegacyPatScopes(tokenScopes)) {
    return true;
  }
  if (required === "repo:read") {
    return tokenScopes.includes("repo:read") || tokenScopes.includes("repo:write");
  }
  return tokenScopes.includes(required);
}

export function requiredPatScopeForRepoRole(role: string): PatScope {
  return role === "READER" ? "repo:read" : "repo:write";
}
