import { getApiUrl } from "@/lib/env";
import {
  getAccessToken,
  refreshAuthCookies,
} from "@/server/auth-cookies";
import {
  generateRequestId,
  normalizeRequestId,
} from "@/server/proxy";

export function buildCoreUrl(
  baseUrl: string,
  path: string,
  search: string,
) {
  if (!isSafeCorePath(path)) throw new Error("Unsafe core path");

  const base = new URL(baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  const target = new URL(path, base);
  const basePath = base.pathname.endsWith("/")
    ? base.pathname
    : `${base.pathname}/`;
  if (target.origin !== base.origin || !target.pathname.startsWith(basePath)) {
    throw new Error("Core path escaped its configured base URL");
  }
  target.search = search;
  return target.toString();
}

export function isSafeCorePath(path: string) {
  if (!path || path.startsWith("/") || path.includes("\\")) return false;

  let decoded = path;
  try {
    while (true) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
  } catch {
    return false;
  }
  if (decoded.includes("\\") || decoded.includes("\0")) return false;
  return decoded
    .split("/")
    .every((segment) => segment !== "." && segment !== "..");
}

export async function forwardCoreRequest(
  request: Request,
  path: string,
): Promise<Response> {
  const incomingUrl = new URL(request.url);
  const upstreamPath =
    incomingUrl.pathname.endsWith("/") && !path.endsWith("/")
      ? `${path}/`
      : path;
  const target = buildCoreUrl(
    getApiUrl(),
    upstreamPath,
    incomingUrl.search,
  );
  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.arrayBuffer();
  const requestId =
    normalizeRequestId(request.headers.get("x-request-id")) ??
    generateRequestId();

  const isPublic = isPublicCoreRequest(request.method, upstreamPath);
  let access = getAccessToken();
  if (isPublic && !access) {
    const response = await callCore(
      target,
      request,
      body,
      null,
      requestId,
    );
    return copyCoreResponse(response, requestId);
  }
  if (!access) access = await refreshAuthCookies();
  if (!access) return expiredResponse(requestId);

  let response = await callCore(target, request, body, access, requestId);
  if (response.status === 401) {
    access = await refreshAuthCookies();
    if (!access) return expiredResponse(requestId);
    response = await callCore(target, request, body, access, requestId);
  }

  return copyCoreResponse(response, requestId);
}

async function copyCoreResponse(response: Response, requestId: string) {
  const responseBody = await response.arrayBuffer();
  return new Response(responseBody, {
    status: response.status,
    headers: {
      "cache-control": "no-store",
      "content-type":
        response.headers.get("content-type") ?? "application/json",
      "x-request-id": requestId,
    },
  });
}

async function callCore(
  target: string,
  request: Request,
  body: ArrayBuffer | undefined,
  access: string | null,
  requestId: string,
) {
  const headers: Record<string, string> = {
    "Content-Type":
      request.headers.get("content-type") ?? "application/json",
    "X-Request-Id": requestId,
  };
  if (access) headers.Authorization = `Bearer ${access}`;
  const country = request.headers.get("x-user-country");
  if (country) headers["X-User-Country"] = country;

  return fetch(target, {
    method: request.method,
    headers,
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });
}

const PUBLIC_CORE_PATHS = new Set([
  "auth/password/reset/",
  "auth/password/reset/confirm/",
]);

export function isPublicCoreRequest(method: string, path: string) {
  if (PUBLIC_CORE_PATHS.has(path)) return true;

  const normalizedMethod = method.toUpperCase();
  return (
    (normalizedMethod === "GET" || normalizedMethod === "HEAD") &&
    /^content\/[1-9]\d*\/$/.test(path)
  );
}

function expiredResponse(requestId: string) {
  return new Response(
    JSON.stringify({
      error: "SESSION_EXPIRED",
      detail: "Session expired. Please log in again.",
    }),
    {
      status: 401,
      headers: {
        "cache-control": "no-store",
        "content-type": "application/json",
        "x-request-id": requestId,
      },
    },
  );
}
