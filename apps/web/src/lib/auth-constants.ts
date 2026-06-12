export const ACCESS_TOKEN_KEY = "svnhub_access_token";
export const REFRESH_TOKEN_KEY = "svnhub_refresh_token";
export const ACCESS_TOKEN_EXPIRES_AT_KEY = "svnhub_access_token_expires_at";

export const REFRESH_TOKEN_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
export const ACCESS_TOKEN_REFRESH_BUFFER_MS = 60_000;

export function shouldRefreshAccessToken(expiresAtRaw: string | undefined): boolean {
  if (!expiresAtRaw) {
    return true;
  }

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt)) {
    return true;
  }

  return Date.now() >= expiresAt - ACCESS_TOKEN_REFRESH_BUFFER_MS;
}
