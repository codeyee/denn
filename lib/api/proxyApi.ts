import { getProxyApiUrl, getProxyApiKey } from "@/lib/env";
import { getUserCountryCode } from "@/lib/utils/countryUtils";

const CONTENT_TYPE_JSON = "application/json";

interface ProxyRequestConfig {
  signal?: AbortSignal;
  country?: string;
}

async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type");
  const isJson = contentType?.includes(CONTENT_TYPE_JSON) ?? false;

  if (!response.ok) {
    if (isJson) {
      const errorData = await response.json().catch(() => ({}));
      const message =
        typeof errorData.message === "string" ? errorData.message :
        typeof errorData.error === "string" ? errorData.error :
        JSON.stringify(errorData);
      throw new Error(`Proxy request failed (${response.status}): ${message}`);
    }
    throw new Error(`Proxy request failed (${response.status}): ${response.statusText}`);
  }

  if (response.status === 204) return {} as T;
  if (isJson) return (await response.json()) as T;
  return (await response.text()) as T;
}

export async function proxyRequest<T = unknown>(
  endpoint: string,
  config: ProxyRequestConfig = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": CONTENT_TYPE_JSON,
    "X-Api-Key": getProxyApiKey(),
  };

  if (config.country) {
    headers["X-User-Country"] = config.country;
  }

  const url = `${getProxyApiUrl()}${endpoint}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: config.signal,
    });

    return handleResponse<T>(response);
  } catch (error) {
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      throw new Error(
        `Network error: Unable to connect to proxy at ${url}. Please check if the proxy server is running.`
      );
    }
    if (error instanceof Error) throw error;
    throw new Error("An unexpected error occurred");
  }
}

export const proxyApi = {
  get: <T = unknown>(
    endpoint: string,
    options?: { signal?: AbortSignal; country?: string }
  ) =>
    proxyRequest<T>(endpoint, options),

  getWithCountry: <T = unknown>(
    endpoint: string,
    options?: { signal?: AbortSignal; country?: string }
  ) =>
    proxyRequest<T>(endpoint, {
      ...options,
      country: options?.country || getUserCountryCode(),
    }),
};
