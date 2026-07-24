import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";

import { getApiUrl } from "@/lib/env";
import type { Profile } from "@/lib/types";
import {
  clearAuthCookies,
  getAccessToken,
  getRefreshToken,
  refreshAuthCookies,
} from "@/server/auth-cookies";
import { getLogicalRequestId } from "@/server/proxy";

export interface SessionSnapshot {
  user: Profile | null;
  isAuthenticated: boolean;
  resolution:
    | "anonymous"
    | "authenticated"
    | "expired"
    | "unavailable"
    | "timeout";
}

const EMPTY_SESSION: SessionSnapshot = {
  user: null,
  isAuthenticated: false,
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
    signal: AbortSignal.timeout(3_000),
  });

  if (response.status === 401) return null;
  if (!response.ok) {
    throw new Error(`Failed to fetch auth profile (${response.status})`);
  }
  return (await response.json()) as Profile;
}

async function resolveSession(): Promise<SessionSnapshot> {
  const requestId = getLogicalRequestId();
  const accessToken = getAccessToken();
  const hasRefreshToken = Boolean(getRefreshToken());

  if (!accessToken && !hasRefreshToken) return EMPTY_SESSION;

  if (accessToken) {
    const user = await fetchUserProfile(accessToken, requestId);
    if (user) {
      return {
        user,
        isAuthenticated: true,
        resolution: "authenticated",
      };
    }
  }

  if (!hasRefreshToken) {
    clearAuthCookies();
    return { ...EMPTY_SESSION, resolution: "expired" };
  }

  const refreshedAccess = await refreshAuthCookies();
  if (!refreshedAccess) {
    return { ...EMPTY_SESSION, resolution: "expired" };
  }

  const user = await fetchUserProfile(refreshedAccess, requestId);
  if (!user) {
    clearAuthCookies();
    return { ...EMPTY_SESSION, resolution: "expired" };
  }

  return {
    user,
    isAuthenticated: true,
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
    } catch (error) {
      const resolution =
        error instanceof DOMException &&
        (error.name === "TimeoutError" || error.name === "AbortError")
          ? "timeout"
          : "unavailable";
      console.error(
        JSON.stringify({
          ts: new Date().toISOString(),
          level: "error",
          msg: "session_bootstrap",
          service: "web",
          request_id: requestId,
          resolution,
          duration_ms:
            Math.round((performance.now() - started) * 100) / 100,
          error:
            error instanceof Error ? error.message : String(error),
        }),
      );
      return { ...EMPTY_SESSION, resolution };
    }
  },
);

export const getCountryFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<string | null> => {
    return getCookie("user-country") ?? "CO";
  },
);
