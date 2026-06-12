import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  ACCESS_TOKEN_EXPIRES_AT_KEY,
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  REFRESH_TOKEN_MAX_AGE_SECONDS,
  shouldRefreshAccessToken,
} from "@/lib/auth-constants";

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

function shouldAttemptRefresh(request: NextRequest): boolean {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_KEY)?.value;
  if (!refreshToken) {
    return false;
  }

  const accessToken = request.cookies.get(ACCESS_TOKEN_KEY)?.value;
  if (!accessToken) {
    return true;
  }

  return shouldRefreshAccessToken(request.cookies.get(ACCESS_TOKEN_EXPIRES_AT_KEY)?.value);
}

export async function middleware(request: NextRequest) {
  if (!shouldAttemptRefresh(request)) {
    return NextResponse.next();
  }

  const refreshToken = request.cookies.get(REFRESH_TOKEN_KEY)!.value;

  try {
    const refreshResponse = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!refreshResponse.ok) {
      const response = NextResponse.next();
      response.cookies.delete(ACCESS_TOKEN_KEY);
      response.cookies.delete(REFRESH_TOKEN_KEY);
      response.cookies.delete(ACCESS_TOKEN_EXPIRES_AT_KEY);
      return response;
    }

    const data = (await refreshResponse.json()) as {
      tokens: { accessToken: string; refreshToken: string; expiresIn: number };
    };

    const response = NextResponse.next();
    const expiresIn = data.tokens.expiresIn;
    const expiresAt = String(Date.now() + expiresIn * 1000);

    response.cookies.set(ACCESS_TOKEN_KEY, data.tokens.accessToken, {
      path: "/",
      maxAge: expiresIn,
      sameSite: "lax",
    });
    response.cookies.set(REFRESH_TOKEN_KEY, data.tokens.refreshToken, {
      path: "/",
      maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
      sameSite: "lax",
    });
    response.cookies.set(ACCESS_TOKEN_EXPIRES_AT_KEY, expiresAt, {
      path: "/",
      maxAge: expiresIn,
      sameSite: "lax",
    });

    return response;
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
