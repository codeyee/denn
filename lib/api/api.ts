import { useAuthStore } from "@/app/_stores/auth-store";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

let refreshPromise: Promise<void> | null = null;

async function performTokenRefresh(): Promise<void> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const { refreshToken, setAccessToken, setRefreshToken } = useAuthStore.getState();
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
      throw new Error("Token refresh failed");
    }

    const data = await response.json();
    if (data?.access) setAccessToken(data.access);
    if (data?.refresh) setRefreshToken(data.refresh);
  })()
    .catch((err) => {
      const { setAccessToken, setRefreshToken } = useAuthStore.getState();
      setAccessToken(null);
      setRefreshToken(null);
      throw err;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

interface RequestConfig extends RequestInit {
  requiresAuth?: boolean;
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  const { requiresAuth = false, headers = {}, ...rest } = config;

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
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

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    let response = await fetch(url, {
      ...rest,
      headers: requestHeaders,
    });

    // Handle non-JSON responses
    const contentType = response.headers.get("content-type");
    const isJson = contentType?.includes("application/json");

    if (!response.ok) {
      if (requiresAuth && response.status === 401) {
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
          });

          const retriedContentType = response.headers.get("content-type");
          const retriedIsJson = retriedContentType?.includes("application/json");
          if (!response.ok) {
            if (retriedIsJson) {
              const retryErrorData = await response.json().catch(() => ({}));
              const errorMessage = retryErrorData.message
                || retryErrorData.detail
                || retryErrorData.error
                || JSON.stringify(retryErrorData);
              throw new Error(`Request failed (${response.status}): ${errorMessage}`);
            }
            throw new Error(`Request failed (${response.status}): ${response.statusText || 'No error details'}`);
          }

          if (response.status === 204) {
            return {} as T;
          }
          if (retriedIsJson) {
            return (await response.json()) as T;
          }
          const retriedText = await response.text();
          return retriedText as unknown as T;
        } catch (e) {
          console.error("Token refresh failed", e);
        }
      }

      if (isJson) {
        const errorData = await response.json();
        const errorMessage = errorData.message
          || errorData.detail
          || errorData.error
          || JSON.stringify(errorData);
        throw new Error(`Request failed (${response.status}): ${errorMessage}`);
      }
      throw new Error(`Request failed (${response.status}): ${response.statusText || 'No error details'}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    if (isJson) {
      return await response.json();
    }

    const text = await response.text();
    return text as unknown as T;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unexpected error occurred");
  }
}

export const api = {
  get: <T = unknown>(endpoint: string, requiresAuth = false) =>
    apiRequest<T>(endpoint, { method: "GET", requiresAuth }),

  post: <T = unknown>(endpoint: string, data?: unknown, requiresAuth = false) =>
    apiRequest<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
      requiresAuth,
    }),

  put: <T = unknown>(endpoint: string, data?: unknown, requiresAuth = false) =>
    apiRequest<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
      requiresAuth,
    }),

  patch: <T = unknown>(endpoint: string, data?: unknown, requiresAuth = false) =>
    apiRequest<T>(endpoint, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
      requiresAuth,
    }),

  delete: <T = unknown>(endpoint: string, requiresAuth = false) =>
    apiRequest<T>(endpoint, { method: "DELETE", requiresAuth }),
};
