"use client";

import { useAuthStore } from "@/app/_stores/auth-store";
import { useCallback, useState } from "react";

interface UseApiOptions {
  requiresAuth?: boolean;
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
}

/**
 * Custom hook for making API requests with automatic auth token handling
 * Provides loading and error states
 */
export function useApi<T = unknown>(
  endpoint: string,
  options: UseApiOptions = {}
) {
  const { requiresAuth = false, onSuccess, onError } = options;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const token = useAuthStore((state) => state.token);

  const execute = useCallback(
    async (method: string = "GET", body?: unknown) => {
      setIsLoading(true);
      setError(null);

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (requiresAuth && token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
        const response = await fetch(`${apiUrl}${endpoint}`, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || `Request failed: ${response.statusText}`
          );
        }

        const responseData = await response.json();
        setData(responseData);
        onSuccess?.(responseData);
        return responseData;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An error occurred";
        setError(errorMessage);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [endpoint, requiresAuth, token, onSuccess, onError]
  );

  const get = useCallback(() => execute("GET"), [execute]);
  const post = useCallback((body: unknown) => execute("POST", body), [execute]);
  const put = useCallback((body: unknown) => execute("PUT", body), [execute]);
  const patch = useCallback(
    (body: unknown) => execute("PATCH", body),
    [execute]
  );
  const del = useCallback(() => execute("DELETE"), [execute]);

  return {
    data,
    isLoading,
    error,
    execute,
    get,
    post,
    put,
    patch,
    delete: del,
  };
}
