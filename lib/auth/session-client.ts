import Cookies from "js-cookie";
import { AUTH_ACCESS_COOKIE, AUTH_COOKIE_DAYS, AUTH_REFRESH_COOKIE } from "./constants";

interface AuthTokens {
  accessToken: string | null;
  refreshToken: string | null;
}

function buildCookieOptions() {
  return {
    expires: AUTH_COOKIE_DAYS,
    sameSite: "lax" as const,
    secure: typeof window !== "undefined" && window.location.protocol === "https:",
  };
}

export function syncAuthCookies({ accessToken, refreshToken }: AuthTokens) {
  if (typeof window === "undefined") {
    return;
  }

  const cookieOptions = buildCookieOptions();

  if (accessToken) {
    Cookies.set(AUTH_ACCESS_COOKIE, accessToken, cookieOptions);
  } else {
    Cookies.remove(AUTH_ACCESS_COOKIE);
  }

  if (refreshToken) {
    Cookies.set(AUTH_REFRESH_COOKIE, refreshToken, cookieOptions);
  } else {
    Cookies.remove(AUTH_REFRESH_COOKIE);
  }
}

export function clearAuthCookies() {
  syncAuthCookies({
    accessToken: null,
    refreshToken: null,
  });
}
