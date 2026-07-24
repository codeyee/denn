import { getCsrfHeader } from "@/lib/auth/client";
import { useAuthStore } from "@/stores/auth-store";

const CONTENT_TYPE_JSON = "application/json";
const HTTP_STATUS_NO_CONTENT = 204;

interface RequestConfig extends RequestInit {
  requiresAuth?: boolean;
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  config: RequestConfig = {},
): Promise<T> {
  const { requiresAuth: _requiresAuth, headers = {}, ...rest } = config;
  const requestHeaders = new Headers(headers);
  requestHeaders.set("Content-Type", CONTENT_TYPE_JSON);

  if (isMutation(rest.method)) {
    const csrfHeaders = await getCsrfHeader();
    Object.entries(csrfHeaders).forEach(([key, value]) => {
      requestHeaders.set(key, value);
    });
  }

  const response = await fetch(`/api/core${endpoint}`, {
    ...rest,
    headers: requestHeaders,
    credentials: "same-origin",
  });
  const isJson =
    response.headers.get("content-type")?.includes(CONTENT_TYPE_JSON) ??
    false;

  if (!response.ok) {
    const errorData = isJson
      ? ((await response.json().catch(() => ({}))) as Record<
          string,
          unknown
        >)
      : {};
    const message = extractErrorMessage(errorData);

    if (response.status === 401) {
      useAuthStore.getState().clearSession();
      useAuthStore.getState().setSessionResolution("expired");
    }
    throw new Error(
      `Request failed (${response.status})${message ? `: ${message}` : ""}`,
    );
  }

  if (response.status === HTTP_STATUS_NO_CONTENT) return {} as T;
  if (isJson) return (await response.json()) as T;
  return (await response.text()) as T;
}

function isMutation(method?: string) {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(
    method?.toUpperCase() ?? "GET",
  );
}

function extractErrorMessage(errorData: Record<string, unknown>) {
  for (const key of ["message", "detail", "error"]) {
    if (typeof errorData[key] === "string" && errorData[key]) {
      return errorData[key];
    }
  }
  return Object.keys(errorData).length > 0
    ? JSON.stringify(errorData)
    : "";
}

export const api = {
  get: <T = unknown>(
    endpoint: string,
    requiresAuth = false,
    signal?: AbortSignal,
  ) => apiRequest<T>(endpoint, { method: "GET", requiresAuth, signal }),

  post: <T = unknown>(
    endpoint: string,
    data?: unknown,
    requiresAuth = false,
    signal?: AbortSignal,
  ) =>
    apiRequest<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
      requiresAuth,
      signal,
    }),

  put: <T = unknown>(
    endpoint: string,
    data?: unknown,
    requiresAuth = false,
    signal?: AbortSignal,
  ) =>
    apiRequest<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
      requiresAuth,
      signal,
    }),

  patch: <T = unknown>(
    endpoint: string,
    data?: unknown,
    requiresAuth = false,
    signal?: AbortSignal,
  ) =>
    apiRequest<T>(endpoint, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
      requiresAuth,
      signal,
    }),

  delete: <T = unknown>(
    endpoint: string,
    requiresAuth = false,
    signal?: AbortSignal,
  ) =>
    apiRequest<T>(endpoint, {
      method: "DELETE",
      requiresAuth,
      signal,
    }),
};
