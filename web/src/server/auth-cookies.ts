import {
  deleteCookie,
  getCookie,
  setCookie,
} from "@tanstack/react-start/server";

import {
  AUTH_ACCESS_COOKIE,
  AUTH_REFRESH_COOKIE,
  CSRF_COOKIE,
} from "@/lib/auth/constants";
import { getApiUrl } from "@/lib/env";
import type { TokenRefresh } from "@/lib/types";
import { getLogicalRequestId } from "@/server/proxy";

const ACCESS_MAX_AGE_SECONDS = 60 * 60;
const REFRESH_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const CSRF_MAX_AGE_SECONDS = REFRESH_MAX_AGE_SECONDS;

interface AuthTokens {
  access: string;
  refresh: string;
}

const refreshes = new Map<string, Promise<AuthTokens | null>>();

function secureCookiesEnabled() {
  const configured = process.env.AUTH_COOKIE_SECURE?.trim().toLowerCase();
  if (configured === "true") return true;
  if (configured === "false") return false;
  return process.env.NODE_ENV === "production";
}

function cookieDomain() {
  return process.env.AUTH_COOKIE_DOMAIN?.trim() || undefined;
}

function authCookieOptions(maxAge: number) {
  return {
    domain: cookieDomain(),
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite: "lax" as const,
    secure: secureCookiesEnabled(),
  };
}

function csrfCookieOptions() {
  return {
    domain: cookieDomain(),
    httpOnly: false,
    maxAge: CSRF_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax" as const,
    secure: secureCookiesEnabled(),
  };
}

export function setAuthCookies(tokens: AuthTokens) {
  setCookie(
    AUTH_ACCESS_COOKIE,
    tokens.access,
    authCookieOptions(ACCESS_MAX_AGE_SECONDS),
  );
  setCookie(
    AUTH_REFRESH_COOKIE,
    tokens.refresh,
    authCookieOptions(REFRESH_MAX_AGE_SECONDS),
  );
}

export function clearAuthCookies() {
  const options = {
    domain: cookieDomain(),
    path: "/",
    sameSite: "lax" as const,
    secure: secureCookiesEnabled(),
  };
  deleteCookie(AUTH_ACCESS_COOKIE, options);
  deleteCookie(AUTH_REFRESH_COOKIE, options);
}

export function getAccessToken() {
  return getCookie(AUTH_ACCESS_COOKIE) ?? null;
}

export function getRefreshToken() {
  return getCookie(AUTH_REFRESH_COOKIE) ?? null;
}

export function getOrCreateCsrfToken() {
  const existing = getCookie(CSRF_COOKIE);
  if (existing) return existing;

  const token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll(
    "-",
    "",
  );
  setCookie(CSRF_COOKIE, token, csrfCookieOptions());
  return token;
}

export function clearCsrfCookie() {
  deleteCookie(CSRF_COOKIE, {
    domain: cookieDomain(),
    path: "/",
    sameSite: "lax",
    secure: secureCookiesEnabled(),
  });
}

export async function refreshAuthCookies(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  let pending = refreshes.get(refreshToken);
  if (!pending) {
    pending = requestRotatedTokens(refreshToken).finally(() => {
      refreshes.delete(refreshToken);
    });
    refreshes.set(refreshToken, pending);
  }

  const tokens = await pending;
  if (!tokens) {
    clearAuthCookies();
    return null;
  }
  setAuthCookies(tokens);
  return tokens.access;
}

async function requestRotatedTokens(
  refreshToken: string,
): Promise<AuthTokens | null> {
  const response = await fetch(`${getApiUrl()}/auth/token/refresh/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Request-Id": getLogicalRequestId(),
    },
    body: JSON.stringify({ refresh: refreshToken }),
    cache: "no-store",
    signal: AbortSignal.timeout(3_000),
  });

  if (response.status === 401) return null;
  if (!response.ok) {
    throw new Error(`Failed to refresh auth token (${response.status})`);
  }

  const tokens = (await response.json()) as TokenRefresh;
  if (!tokens.access) {
    throw new Error("Refresh response did not include an access token");
  }
  const rotatedRefresh =
    extractUpstreamCookie(response, AUTH_REFRESH_COOKIE) ??
    tokens.refresh ??
    null;
  if (!rotatedRefresh) {
    throw new Error("Refresh response did not include a refresh token");
  }
  return {
    access: tokens.access,
    refresh: rotatedRefresh,
  };
}

export function extractUpstreamCookie(
  response: Response,
  name: string,
): string | null {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const values = headers.getSetCookie?.() ?? [
    response.headers.get("set-cookie") ?? "",
  ];
  const prefix = `${name}=`;

  for (const value of values) {
    const cookie = value
      .split(/,(?=[^;,]+=)/)
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix));
    if (cookie) return cookie.slice(prefix.length).split(";", 1)[0] ?? null;
  }
  return null;
}
