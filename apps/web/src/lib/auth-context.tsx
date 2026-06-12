"use client";

import type { AuthResponse, AuthUser } from "@svnhub/shared";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { apiFetch } from "@/lib/api-client";
import {
  clearAuthTokens,
  ensureAuthCookiesFromStorage,
  getAccessTokenSync,
  isAccessTokenExpired,
  persistAuthTokens,
} from "@/lib/auth-storage";
import { REFRESH_TOKEN_KEY } from "@/lib/auth-constants";
import { refreshAuthSession, syncTokensFromDocumentCookies } from "@/lib/auth-session";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    syncTokensFromDocumentCookies();
    ensureAuthCookiesFromStorage();

    const accessToken = getAccessTokenSync();
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!accessToken && !refreshToken) {
      setUser(null);
      return;
    }

    if (isAccessTokenExpired() && refreshToken) {
      const session = await refreshAuthSession();
      if (session) {
        setUser(session.user);
        return;
      }
      clearAuthTokens();
      setUser(null);
      return;
    }

    try {
      const profile = await apiFetch<AuthUser>("/auth/me");
      setUser(profile);
    } catch {
      const session = await refreshAuthSession();
      if (session) {
        setUser(session.user);
        return;
      }
      clearAuthTokens();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!localStorage.getItem(REFRESH_TOKEN_KEY)) {
        return;
      }

      if (!isAccessTokenExpired()) {
        return;
      }

      void refreshAuthSession().then((session) => {
        if (session) {
          setUser(session.user);
        }
      });
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiFetch<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    persistAuthTokens(response.tokens);
    setUser(response.user);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      try {
        await apiFetch("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // ignore logout errors
      }
    }

    clearAuthTokens();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, refreshUser }),
    [user, loading, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
