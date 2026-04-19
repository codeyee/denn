import "server-only";

const FALLBACK_BASE_URL = "http://localhost:8080/v1/proxy";

let warnedMissingKey = false;

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
  options: { requestId?: string | null } = {}
): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  const apiKey = getProxyApiKey();
  if (apiKey) {
    headers["X-Api-Key"] = apiKey;
  }

  if (country) {
    headers["X-User-Country"] = country;
  }

  const requestId = options.requestId ?? generateRequestId();
  headers["X-Request-Id"] = requestId;

  return headers;
}

// Lightweight UUIDv4 generator. We avoid pulling `uuid` into the server
// bundle when the runtime already exposes crypto.randomUUID (Node ≥19,
// modern edge runtimes). Falls back to a non-cryptographic stub only in
// ancient environments — those should never reach prod.
export function generateRequestId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) {
    return g.crypto.randomUUID();
  }
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
