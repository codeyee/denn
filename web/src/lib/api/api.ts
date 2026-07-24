import { useAuthStore } from "@/stores/auth-store";

import { getApiUrl } from "@/lib/env";
import { syncAuthCookies } from "@/lib/auth/session-client";

const CONTENT_TYPE_JSON = "application/json";
const DEFAULT_ERROR_DETAILS = "No error details";
const HTTP_STATUS_UNAUTHORIZED = 401;
const HTTP_STATUS_NO_CONTENT = 204;

let refreshPromise: Promise<void> | null = null;

async function performTokenRefresh(): Promise<void> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const {
      refreshToken,
      setAccessToken,
      setRefreshToken,
      clearSession,
      setSessionResolution,
    } =
      useAuthStore.getState();
    if (!refreshToken) {
      clearSession();
      setSessionResolution("expired");
      logSessionRefresh("expired");
      throw new Error("Session expired. Please log in again.");
    }

    const response = await fetch(`${getApiUrl()}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": CONTENT_TYPE_JSON },
      body: JSON.stringify({ refresh: refreshToken }),
      signal: AbortSignal.timeout(3_000),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = extractErrorMessage(errorData);

      if (response.status === HTTP_STATUS_UNAUTHORIZED) {
        clearSession();
        setSessionResolution("expired");
        logSessionRefresh("expired");
        throw new Error(
          `Session expired. Please log in again.${errorMessage ? ` ${errorMessage}` : ""}`
        );
      }

      throw new Error(
        `Token refresh failed${errorMessage ? `: ${errorMessage}` : ""}`
      );
    }

    const data = await response.json();
    if (data?.access) setAccessToken(data.access);
    if (data?.refresh) setRefreshToken(data.refresh);
    syncAuthCookies({
      accessToken: data?.access ?? useAuthStore.getState().accessToken,
      refreshToken: data?.refresh ?? useAuthStore.getState().refreshToken,
    });
    setSessionResolution("authenticated");
    logSessionRefresh("authenticated");
  })()
    .catch((err) => {
      if (err instanceof Error && err.message.startsWith("Session expired.")) {
        throw err;
      }

      const resolution =
        err instanceof DOMException &&
        (err.name === "TimeoutError" || err.name === "AbortError")
          ? "timeout"
          : "unavailable";
      useAuthStore.getState().setSessionResolution(resolution);
      logSessionRefresh(resolution);
      throw err;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

function logSessionRefresh(
  resolution: "authenticated" | "expired" | "unavailable" | "timeout",
) {
  console.info(
    JSON.stringify({
      msg: "session_refresh",
      resolution,
    }),
  );
}

interface RequestConfig extends RequestInit {
  requiresAuth?: boolean;
}

function isJsonResponse(contentType: string | null): boolean {
  return contentType?.includes(CONTENT_TYPE_JSON) ?? false;
}

function extractErrorMessage(errorData: Record<string, unknown>): string {
  if (typeof errorData.message === "string" && errorData.message) {
    return errorData.message;
  }
  if (typeof errorData.detail === "string" && errorData.detail) {
    return errorData.detail;
  }
  if (typeof errorData.error === "string" && errorData.error) {
    return errorData.error;
  }
  return JSON.stringify(errorData);
}

function createErrorResponse(status: number, errorMessage: string): Error {
  return new Error(`Request failed (${status}): ${errorMessage}`);
}

async function handleErrorResponse(
  response: Response,
  isJson: boolean
): Promise<never> {
  if (isJson) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = extractErrorMessage(errorData);
    throw createErrorResponse(response.status, errorMessage);
  }
  throw createErrorResponse(
    response.status,
    response.statusText || DEFAULT_ERROR_DETAILS
  );
}

async function parseResponse<T>(response: Response, isJson: boolean): Promise<T> {
  if (response.status === HTTP_STATUS_NO_CONTENT) {
    return {} as T;
  }
  if (isJson) {
    return (await response.json()) as T;
  }
  const text = await response.text();
  return text as T;
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  const { requiresAuth = false, headers = {}, ...rest } = config;

  const requestHeaders: Record<string, string> = {
    "Content-Type": CONTENT_TYPE_JSON,
  };

  if (headers) {
    Object.entries(headers).forEach(([key, value]) => {
      if (typeof value === "string") {
        requestHeaders[key] = value;
      }
    });
  }

  if (requiresAuth) {
    const accessToken = useAuthStore.getState().accessToken;
    if (accessToken) {
      requestHeaders["Authorization"] = `Bearer ${accessToken}`;
    }
  }

  const url = `${getApiUrl()}${endpoint}`;

  try {
    let response = await fetch(url, {
      ...rest,
      headers: requestHeaders,
      signal: rest.signal,
    });

    const contentType = response.headers.get("content-type");
    const isJson = isJsonResponse(contentType);

    if (!response.ok) {
      if (requiresAuth && response.status === HTTP_STATUS_UNAUTHORIZED) {
        try {
          await performTokenRefresh();

          const newHeaders: Record<string, string> = { ...requestHeaders };
          const newAccessToken = useAuthStore.getState().accessToken;
          if (newAccessToken) {
            newHeaders["Authorization"] = `Bearer ${newAccessToken}`;
          }

          response = await fetch(url, {
            ...rest,
            headers: newHeaders,
            signal: rest.signal,
          });

          const retriedContentType = response.headers.get("content-type");
          const retriedIsJson = isJsonResponse(retriedContentType);

          if (!response.ok) {
            await handleErrorResponse(response, retriedIsJson);
          }

          return parseResponse<T>(response, retriedIsJson);
        } catch (e) {
          console.error("Token refresh failed", e);
          throw e;
        }
      }

      await handleErrorResponse(response, isJson);
    }

    return parseResponse<T>(response, isJson);
  } catch (error) {
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      const errorMessage = `Network error: Unable to connect to ${url}. Please check if the backend server is running and accessible.`;
      console.error(errorMessage, {
        url,
        apiBaseUrl: getApiUrl(),
        endpoint,
      });
      throw new Error(errorMessage);
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unexpected error occurred");
  }
}

export const api = {
  get: <T = unknown>(endpoint: string, requiresAuth = false, signal?: AbortSignal) =>
    apiRequest<T>(endpoint, { method: "GET", requiresAuth, signal }),

  post: <T = unknown>(endpoint: string, data?: unknown, requiresAuth = false, signal?: AbortSignal) =>
    apiRequest<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
      requiresAuth,
      signal,
    }),

  put: <T = unknown>(endpoint: string, data?: unknown, requiresAuth = false, signal?: AbortSignal) =>
    apiRequest<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
      requiresAuth,
      signal,
    }),

  patch: <T = unknown>(endpoint: string, data?: unknown, requiresAuth = false, signal?: AbortSignal) =>
    apiRequest<T>(endpoint, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
      requiresAuth,
      signal,
    }),

  delete: <T = unknown>(endpoint: string, requiresAuth = false, signal?: AbortSignal) =>
    apiRequest<T>(endpoint, { method: "DELETE", requiresAuth, signal }),
};
