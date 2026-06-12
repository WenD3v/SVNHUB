import { getAccessToken } from "./auth-storage";
import { refreshAuthSession } from "./auth-session";

function isAuthPath(path: string): boolean {
  return path.startsWith("/auth/login") || path.startsWith("/auth/refresh") || path.startsWith("/auth/logout");
}

export async function apiFetch<T>(path: string, init?: RequestInit, retried = false): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const token = await getAccessToken();

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (response.status === 401 && !retried && !isAuthPath(path)) {
    const refreshed = await refreshAuthSession();
    if (refreshed) {
      return apiFetch<T>(path, init, true);
    }
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `API error ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function apiUploadForm<T>(path: string, formData: FormData, retried = false): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const token = await getAccessToken();

  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
    cache: "no-store",
  });

  if (response.status === 401 && !retried) {
    const refreshed = await refreshAuthSession();
    if (refreshed) {
      return apiUploadForm<T>(path, formData, true);
    }
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `API error ${response.status}`);
  }

  return response.json() as Promise<T>;
}
