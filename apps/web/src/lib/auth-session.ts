import type { AuthResponse } from "@svnhub/shared";

import {
  ACCESS_TOKEN_EXPIRES_AT_KEY,
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
} from "./auth-constants";
import {
  clearAuthTokens,
  getRefreshToken,
  persistAuthTokens,
} from "./auth-storage";

let refreshPromise: Promise<AuthResponse | null> | null = null;

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

async function performRefresh(): Promise<AuthResponse | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  const response = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
    cache: "no-store",
  });

  if (!response.ok) {
    if (typeof window !== "undefined") {
      clearAuthTokens();
    }
    return null;
  }

  const data = (await response.json()) as AuthResponse;
  persistAuthTokens(data.tokens);
  return data;
}

export async function refreshAuthSession(): Promise<AuthResponse | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = performRefresh();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export function syncTokensFromDocumentCookies(): void {
  if (typeof document === "undefined") {
    return;
  }

  const parsed = document.cookie.split(";").reduce<Record<string, string>>((acc, part) => {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rawKey) {
      acc[rawKey] = decodeURIComponent(rest.join("="));
    }
    return acc;
  }, {});

  if (parsed[ACCESS_TOKEN_KEY]) {
    localStorage.setItem(ACCESS_TOKEN_KEY, parsed[ACCESS_TOKEN_KEY]);
  }
  if (parsed[REFRESH_TOKEN_KEY]) {
    localStorage.setItem(REFRESH_TOKEN_KEY, parsed[REFRESH_TOKEN_KEY]);
  }
  if (parsed[ACCESS_TOKEN_EXPIRES_AT_KEY]) {
    localStorage.setItem(ACCESS_TOKEN_EXPIRES_AT_KEY, parsed[ACCESS_TOKEN_EXPIRES_AT_KEY]);
  }
}
