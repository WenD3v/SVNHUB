import type { AuthTokens } from "@svnhub/shared";

import {
  ACCESS_TOKEN_EXPIRES_AT_KEY,
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  REFRESH_TOKEN_MAX_AGE_SECONDS,
} from "./auth-constants";

export {
  ACCESS_TOKEN_EXPIRES_AT_KEY,
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
} from "./auth-constants";

function writeCookie(name: string, value: string, maxAgeSeconds: number): void {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

function clearCookie(name: string): void {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

export function persistAuthTokens(tokens: AuthTokens): void {
  if (typeof window === "undefined") {
    return;
  }

  const expiresAt = Date.now() + tokens.expiresIn * 1000;

  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  localStorage.setItem(ACCESS_TOKEN_EXPIRES_AT_KEY, String(expiresAt));

  writeCookie(ACCESS_TOKEN_KEY, tokens.accessToken, tokens.expiresIn);
  writeCookie(REFRESH_TOKEN_KEY, tokens.refreshToken, REFRESH_TOKEN_MAX_AGE_SECONDS);
  writeCookie(ACCESS_TOKEN_EXPIRES_AT_KEY, String(expiresAt), tokens.expiresIn);
}

export function clearAuthTokens(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_EXPIRES_AT_KEY);

  clearCookie(ACCESS_TOKEN_KEY);
  clearCookie(REFRESH_TOKEN_KEY);
  clearCookie(ACCESS_TOKEN_EXPIRES_AT_KEY);
}

export function ensureAuthCookiesFromStorage(): void {
  if (typeof window === "undefined") {
    return;
  }

  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!accessToken || !refreshToken) {
    return;
  }

  const expiresAtRaw = localStorage.getItem(ACCESS_TOKEN_EXPIRES_AT_KEY);
  const expiresIn = expiresAtRaw
    ? Math.max(60, Math.floor((Number(expiresAtRaw) - Date.now()) / 1000))
    : 900;

  persistAuthTokens({
    accessToken,
    refreshToken,
    expiresIn,
  });
}

export function getAccessTokenSync(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function isAccessTokenExpired(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const expiresAtRaw = localStorage.getItem(ACCESS_TOKEN_EXPIRES_AT_KEY);
  if (!expiresAtRaw) {
    return Boolean(localStorage.getItem(ACCESS_TOKEN_KEY));
  }

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt)) {
    return true;
  }

  return Date.now() >= expiresAt - 60_000;
}

/** @deprecated Use persistAuthTokens / clearAuthTokens */
export function setAccessTokenCookie(token: string, maxAgeSeconds: number): void {
  writeCookie(ACCESS_TOKEN_KEY, token, maxAgeSeconds);
}

/** @deprecated Use clearAuthTokens */
export function clearAccessTokenCookie(): void {
  clearCookie(ACCESS_TOKEN_KEY);
}

export async function getAccessToken(): Promise<string | null> {
  if (typeof window !== "undefined") {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  const { cookies } = await import("next/headers");
  const store = await cookies();
  const value = store.get(ACCESS_TOKEN_KEY)?.value;
  return value ? decodeURIComponent(value) : null;
}

export async function getRefreshToken(): Promise<string | null> {
  if (typeof window !== "undefined") {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  const { cookies } = await import("next/headers");
  const store = await cookies();
  const value = store.get(REFRESH_TOKEN_KEY)?.value;
  return value ? decodeURIComponent(value) : null;
}
