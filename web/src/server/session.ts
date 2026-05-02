import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";

import { AUTH_ACCESS_COOKIE, AUTH_REFRESH_COOKIE } from "@/lib/auth/constants";
import { getApiUrl } from "@/lib/env";
import type { Profile, TokenRefresh } from "@/lib/types";

export interface SessionSnapshot {
  user: Profile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  needsCookieSync: boolean;
}

const EMPTY_SESSION: SessionSnapshot = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  needsCookieSync: false,
};

async function fetchUserProfile(accessToken: string): Promise<Profile | null> {
  const response = await fetch(`${getApiUrl()}/auth/user/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (response.status === 401) return null;
  if (!response.ok) {
    throw new Error(`Failed to fetch auth profile (${response.status})`);
  }
  return (await response.json()) as Profile;
}

async function refreshTokens(refreshToken: string): Promise<TokenRefresh | null> {
  const response = await fetch(`${getApiUrl()}/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: refreshToken }),
    cache: "no-store",
  });

  if (response.status === 401) return null;
  if (!response.ok) {
    throw new Error(`Failed to refresh auth token (${response.status})`);
  }
  return (await response.json()) as TokenRefresh;
}

async function resolveSession(): Promise<SessionSnapshot> {
  const accessToken = getCookie(AUTH_ACCESS_COOKIE) ?? null;
  const refreshToken = getCookie(AUTH_REFRESH_COOKIE) ?? null;

  if (!accessToken && !refreshToken) return EMPTY_SESSION;

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

  if (!refreshToken) return EMPTY_SESSION;

  const refreshedTokens = await refreshTokens(refreshToken);
  if (!refreshedTokens?.access) {
    return { ...EMPTY_SESSION, needsCookieSync: true };
  }

  const user = await fetchUserProfile(refreshedTokens.access);
  if (!user) {
    return { ...EMPTY_SESSION, needsCookieSync: true };
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

export const getSessionFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<SessionSnapshot> => {
    try {
      return await resolveSession();
    } catch (err) {
      // Backend down or unreachable: render the shell as a logged-out user
      // instead of crashing the entire request.
      console.error("getSessionFn: failed to resolve session", err);
      return EMPTY_SESSION;
    }
  },
);

export const getCountryFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<string | null> => {
    return getCookie("user-country") ?? "CO";
  },
);
