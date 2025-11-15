"use client";

import { apiRequest } from "@/lib/api/api";
import { getErrorMessage } from "@/lib/utils/typeGuards";
import { useCallback, useState } from "react";

interface UseApiOptions {
  requiresAuth?: boolean;
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
}

export function useApi<T = unknown>(
  endpoint: string,
  options: UseApiOptions = {}
) {
  const { requiresAuth = false, onSuccess, onError } = options;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (method: string = "GET", body?: unknown) => {
      setIsLoading(true);
      setError(null);

      try {
        const responseData = await apiRequest<T>(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: body ? JSON.stringify(body) : undefined,
          requiresAuth,
        });
        setData(responseData);
        onSuccess?.(responseData);
        return responseData;
      } catch (err) {
        const errorMessage = getErrorMessage(err);
        const errorInstance = err instanceof Error ? err : new Error(errorMessage);
        setError(errorMessage);
        onError?.(errorInstance);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [endpoint, requiresAuth, onSuccess, onError]
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
