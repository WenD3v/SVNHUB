export const ACCESS_TOKEN_KEY = "svnhub_access_token";
export const REFRESH_TOKEN_KEY = "svnhub_refresh_token";

export function setAccessTokenCookie(token: string, maxAgeSeconds: number): void {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${ACCESS_TOKEN_KEY}=${encodeURIComponent(token)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

export function clearAccessTokenCookie(): void {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${ACCESS_TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
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
