import "server-only";

import { cookies } from "next/headers";
import { AUTH_ACCESS_COOKIE, AUTH_REFRESH_COOKIE } from "./constants";
import type { Profile, TokenRefresh } from "@/lib/types";
import { getApiUrl } from "@/lib/env";

export interface SessionSnapshot {
  user: Profile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  needsCookieSync: boolean;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

async function fetchUserProfile(accessToken: string): Promise<Profile | null> {
  const response = await fetch(`${getApiUrl()}/auth/user/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch auth profile (${response.status})`);
  }

  return parseJsonResponse<Profile>(response);
}

async function refreshTokens(refreshToken: string): Promise<TokenRefresh | null> {
  const response = await fetch(`${getApiUrl()}/auth/token/refresh/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh: refreshToken }),
    cache: "no-store",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to refresh auth token (${response.status})`);
  }

  return parseJsonResponse<TokenRefresh>(response);
}

export async function resolveSession(): Promise<SessionSnapshot> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_ACCESS_COOKIE)?.value ?? null;
  const refreshToken = cookieStore.get(AUTH_REFRESH_COOKIE)?.value ?? null;

  if (!accessToken && !refreshToken) {
    return {
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      needsCookieSync: false,
    };
  }

  if (accessToken) {
    const user = await fetchUserProfile(accessToken);

    if (user) {
      return {
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
        needsCookieSync: false,
      };
    }
  }

  if (!refreshToken) {
    return {
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      needsCookieSync: false,
    };
  }

  const refreshedTokens = await refreshTokens(refreshToken);

  if (!refreshedTokens?.access) {
    return {
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      needsCookieSync: true,
    };
  }

  const user = await fetchUserProfile(refreshedTokens.access);

  if (!user) {
    return {
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      needsCookieSync: true,
    };
  }

  return {
    user,
    accessToken: refreshedTokens.access,
    refreshToken: refreshedTokens.refresh ?? refreshToken,
    isAuthenticated: true,
    needsCookieSync:
      refreshedTokens.access !== accessToken ||
      (refreshedTokens.refresh ?? refreshToken) !== refreshToken,
  };
}

export async function getServerCountryCode(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("user-country")?.value ?? null;
}
