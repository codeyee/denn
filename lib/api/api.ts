import { useAuthStore } from "@/app/_stores/auth-store";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

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
    const response = await fetch(url, {
      ...rest,
      headers: requestHeaders,
    });

    // Handle non-JSON responses
    const contentType = response.headers.get("content-type");
    const isJson = contentType?.includes("application/json");

    if (!response.ok) {
      if (isJson) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Request failed: ${response.statusText}`);
      }
      throw new Error(`Request failed: ${response.statusText}`);
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
