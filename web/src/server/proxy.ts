import { createIsomorphicFn } from "@tanstack/react-start";
import {
  getRequest,
  getRequestHeader,
  setResponseHeader,
} from "@tanstack/react-start/server";

const FALLBACK_BASE_URL = "http://localhost:8080/v1/proxy";
const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

let warnedMissingKey = false;
const serverRequestIds = new WeakMap<Request, string>();

export function getProxyBaseUrl(): string {
  return (
    process.env.PROXY_API_URL ||
    process.env.NEXT_PUBLIC_PROXY_API_URL ||
    FALLBACK_BASE_URL
  );
}

export function getProxyApiKey(): string {
  const key = process.env.PROXY_API_KEY ?? "";

  if (!key && !warnedMissingKey) {
    warnedMissingKey = true;
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "PROXY_API_KEY is required in production. The web BFF and SSR helpers refuse to call the proxy without it."
      );
    }
    console.warn(
      "[proxy] PROXY_API_KEY is not set. The proxy will reject requests in production."
    );
  }

  return key;
}

export function buildProxyHeaders(
  country: string | null,
  options: {
    requestId?: string | null;
    consumer?: "web" | "core";
  } = {},
): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "X-Api-Consumer": options.consumer ?? "web",
  };

  const apiKey = getProxyApiKey();
  if (apiKey) {
    headers["X-Api-Key"] = apiKey;
  }

  if (country) {
    headers["X-User-Country"] = country;
  }

  const requestId = normalizeRequestId(options.requestId) ?? generateRequestId();
  headers["X-Request-Id"] = requestId;

  return headers;
}

export function generateRequestId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) {
    return g.crypto.randomUUID();
  }
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeRequestId(value?: string | null): string | null {
  const normalized = value?.trim() ?? "";
  return REQUEST_ID_PATTERN.test(normalized) ? normalized : null;
}

export const getLogicalRequestId = createIsomorphicFn()
  .server(() => {
    const request = getRequest();
    const existing = serverRequestIds.get(request);
    if (existing) return existing;

    const requestId =
      normalizeRequestId(getRequestHeader("X-Request-Id")) ??
      generateRequestId();
    serverRequestIds.set(request, requestId);
    setResponseHeader("X-Request-Id", requestId);
    return requestId;
  })
  .client(() => generateRequestId());
