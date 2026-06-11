/** SVN layout convention used by SVNHUB-created repositories. */
export const SVN_TRUNK = "/trunk";
export const SVN_BRANCHES = "/branches";
export const SVN_TAGS = "/tags";

export type RefKind = "branch" | "tag";

export interface UiRef {
  /** GitHub-style name shown in the UI (e.g. main, feature-x, v1.0). */
  name: string;
  /** branch or tag */
  kind: RefKind;
}

/** Default branch label in the UI maps to /trunk in SVN. */
export const DEFAULT_BRANCH_UI = "main";

/**
 * Convert a UI ref (GitHub nomenclature) to the real SVN path prefix.
 * - main → /trunk
 * - branch feature-x → /branches/feature-x
 * - tag v1.0 → /tags/v1.0
 */
export function uiRefToSvnPath(ref: string, kind: RefKind = "branch"): string {
  if (kind === "tag") {
    return `${SVN_TAGS}/${ref}`;
  }
  if (ref === DEFAULT_BRANCH_UI) {
    return SVN_TRUNK;
  }
  return `${SVN_BRANCHES}/${ref}`;
}

/**
 * Convert an SVN path to a UI ref name and kind.
 * Returns null for paths outside trunk/branches/tags layout.
 */
export function svnPathToUiRef(svnPath: string): UiRef | null {
  const normalized = normalizeSvnPath(svnPath);

  if (normalized === SVN_TRUNK || normalized.startsWith(`${SVN_TRUNK}/`)) {
    return { name: DEFAULT_BRANCH_UI, kind: "branch" };
  }

  if (normalized.startsWith(`${SVN_BRANCHES}/`)) {
    const rest = normalized.slice(SVN_BRANCHES.length + 1);
    const segment = rest.split("/")[0];
    if (!segment) return null;
    return { name: segment, kind: "branch" };
  }

  if (normalized.startsWith(`${SVN_TAGS}/`)) {
    const rest = normalized.slice(SVN_TAGS.length + 1);
    const segment = rest.split("/")[0];
    if (!segment) return null;
    return { name: segment, kind: "tag" };
  }

  return null;
}

/**
 * Strip the branch/tag prefix from an SVN path for display in the file browser.
 * /trunk/src/main.ts @ main → src/main.ts
 * /branches/feature-x/src/main.ts @ feature-x → src/main.ts
 */
export function svnPathToUiPath(svnPath: string, ref: string, kind: RefKind = "branch"): string {
  const prefix = uiRefToSvnPath(ref, kind);
  const normalized = normalizeSvnPath(svnPath);

  if (normalized === prefix) {
    return "";
  }

  if (normalized.startsWith(`${prefix}/`)) {
    return normalized.slice(prefix.length + 1);
  }

  return normalized.replace(/^\//, "");
}

/**
 * Build the full SVN path from a UI path within a ref.
 * src/main.ts @ main → /trunk/src/main.ts
 */
export function uiPathToSvnPath(uiPath: string, ref: string, kind: RefKind = "branch"): string {
  const prefix = uiRefToSvnPath(ref, kind);
  const trimmed = uiPath.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!trimmed) {
    return prefix;
  }
  return `${prefix}/${trimmed}`;
}

/** Resolve the branch/tag root path from any changed SVN path. */
export function resolveBranchRootFromSvnPath(svnPath: string): string | null {
  const normalized = normalizeSvnPath(svnPath);

  if (normalized === SVN_TRUNK || normalized.startsWith(`${SVN_TRUNK}/`)) {
    return SVN_TRUNK;
  }

  if (normalized.startsWith(`${SVN_BRANCHES}/`)) {
    const rest = normalized.slice(SVN_BRANCHES.length + 1);
    const segment = rest.split("/")[0];
    if (!segment) return null;
    return `${SVN_BRANCHES}/${segment}`;
  }

  if (normalized.startsWith(`${SVN_TAGS}/`)) {
    const rest = normalized.slice(SVN_TAGS.length + 1);
    const segment = rest.split("/")[0];
    if (!segment) return null;
    return `${SVN_TAGS}/${segment}`;
  }

  return null;
}

export const PIPELINE_CONFIG_FILENAME = ".svnhub-ci.yml";

export function pipelineConfigSvnPath(branchPath: string): string {
  return `${normalizeSvnPath(branchPath)}/${PIPELINE_CONFIG_FILENAME}`;
}

export function normalizeSvnPath(path: string): string {
  if (!path || path === "/") {
    return "/";
  }
  const withLeading = path.startsWith("/") ? path : `/${path}`;
  return withLeading.replace(/\/+$/, "") || "/";
}

export function slugifyRepoName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Same rules as repository slugs — used for team URLs (/teams/[slug]). */
export function slugifyTeamName(name: string): string {
  return slugifyRepoName(name);
}
