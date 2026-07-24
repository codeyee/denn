import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";

import { AUTH_ACCESS_COOKIE, AUTH_REFRESH_COOKIE } from "@/lib/auth/constants";
import { getApiUrl } from "@/lib/env";
import type { Profile, TokenRefresh } from "@/lib/types";
import { getLogicalRequestId } from "@/server/proxy";

export interface SessionSnapshot {
  user: Profile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  needsCookieSync: boolean;
  resolution: "anonymous" | "authenticated" | "unavailable";
}

const EMPTY_SESSION: SessionSnapshot = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  needsCookieSync: false,
  resolution: "anonymous",
};

async function fetchUserProfile(
  accessToken: string,
  requestId: string,
): Promise<Profile | null> {
  const response = await fetch(`${getApiUrl()}/auth/user/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Request-Id": requestId,
    },
    cache: "no-store",
  });

  if (response.status === 401) return null;
  if (!response.ok) {
    throw new Error(`Failed to fetch auth profile (${response.status})`);
  }
  return (await response.json()) as Profile;
}

async function refreshTokens(
  refreshToken: string,
  requestId: string,
): Promise<TokenRefresh | null> {
  const response = await fetch(`${getApiUrl()}/auth/token/refresh/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Request-Id": requestId,
    },
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
  const requestId = getLogicalRequestId();
  const accessToken = getCookie(AUTH_ACCESS_COOKIE) ?? null;
  const refreshToken = getCookie(AUTH_REFRESH_COOKIE) ?? null;

  if (!accessToken && !refreshToken) return EMPTY_SESSION;

  if (accessToken) {
    const user = await fetchUserProfile(accessToken, requestId);
    if (user) {
      return {
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
        needsCookieSync: false,
        resolution: "authenticated",
      };
    }
  }

  if (!refreshToken) return EMPTY_SESSION;

  const refreshedTokens = await refreshTokens(refreshToken, requestId);
  if (!refreshedTokens?.access) {
    return { ...EMPTY_SESSION, needsCookieSync: true };
  }

  const user = await fetchUserProfile(refreshedTokens.access, requestId);
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
    resolution: "authenticated",
  };
}

export const getSessionFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<SessionSnapshot> => {
    const requestId = getLogicalRequestId();
    const started = performance.now();
    try {
      const session = await resolveSession();
      console.log(
        JSON.stringify({
          ts: new Date().toISOString(),
          level: "info",
          msg: "session_bootstrap",
          service: "web",
          request_id: requestId,
          resolution: session.resolution,
          duration_ms:
            Math.round((performance.now() - started) * 100) / 100,
        }),
      );
      return session;
    } catch (err) {
      console.error(
        JSON.stringify({
          ts: new Date().toISOString(),
          level: "error",
          msg: "session_bootstrap",
          service: "web",
          request_id: requestId,
          resolution: "unavailable",
          duration_ms:
            Math.round((performance.now() - started) * 100) / 100,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
      return { ...EMPTY_SESSION, resolution: "unavailable" };
    }
  },
);

export const getCountryFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<string | null> => {
    return getCookie("user-country") ?? "CO";
  },
);
