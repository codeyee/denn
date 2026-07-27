import { getApiUrl } from "@/lib/env";
import {
  getAccessToken,
  refreshAuthCookies,
} from "@/server/auth-cookies";
import {
  generateRequestId,
  normalizeRequestId,
} from "@/server/proxy";
import { buildCatalogVisitorHeaders } from "@/server/catalog-visitor";

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

  let access = getAccessToken();
  if (PUBLIC_AUTH_PATHS.has(upstreamPath)) {
    const response = await callCore(
      target,
      request,
      body,
      null,
      requestId,
    );
    return copyCoreResponse(response, requestId);
  }
  if (isPublicCoreRequest(request.method, upstreamPath)) {
    return forwardPublicCoreRead({
      target,
      request,
      body,
      requestId,
      access,
      upstreamPath,
    });
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

async function forwardPublicCoreRead({
  target,
  request,
  body,
  requestId,
  access,
  upstreamPath,
}: {
  target: string;
  request: Request;
  body: ArrayBuffer | undefined;
  requestId: string;
  access: string | null;
  upstreamPath: string;
}) {
  if (!access) {
    try {
      access = await refreshAuthCookies();
    } catch {
      access = null;
    }
  }

  let response = await callPublicCore(
    target,
    request,
    body,
    access,
    requestId,
    upstreamPath,
  );
  if (response.status === 401 && access) {
    try {
      access = await refreshAuthCookies();
    } catch {
      access = null;
    }
    if (access) {
      response = await callPublicCore(
        target,
        request,
        body,
        access,
        requestId,
        upstreamPath,
      );
    }
  }
  if (response.status === 401) {
    response = await callPublicCore(
      target,
      request,
      body,
      null,
      requestId,
      upstreamPath,
    );
  }
  return copyCoreResponse(response, requestId);
}

async function callPublicCore(
  target: string,
  request: Request,
  body: ArrayBuffer | undefined,
  access: string | null,
  requestId: string,
  upstreamPath: string,
) {
  const additionalHeaders =
    !access && isPublicContentDetailRequest(request.method, upstreamPath)
      ? await buildCatalogVisitorHeaders()
      : {};
  return callCore(
    target,
    request,
    body,
    access,
    requestId,
    additionalHeaders,
  );
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
  additionalHeaders: Record<string, string> = {},
) {
  const headers: Record<string, string> = {
    "Content-Type":
      request.headers.get("content-type") ?? "application/json",
    "X-Request-Id": requestId,
    ...additionalHeaders,
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

const PUBLIC_AUTH_PATHS = new Set([
  "auth/password/reset/",
  "auth/password/reset/confirm/",
]);

const PUBLIC_READ_PATTERNS = [
  /^profiles\/(?!me(?:\/|$))[a-zA-Z0-9._-]+\/$/,
  /^profiles\/(?!me(?:\/|$))[a-zA-Z0-9._-]+\/(?:progress|completed|ratings|lists)\/$/,
  /^content\/[1-9]\d*\/$/,
  /^content\/ratings\/(?:[1-9]\d*\/)?$/,
  /^content\/lists\/[1-9]\d*\/$/,
];

export function isPublicCoreRequest(method: string, path: string) {
  if (PUBLIC_AUTH_PATHS.has(path)) return true;
  const normalizedMethod = method.toUpperCase();
  if (normalizedMethod !== "GET" && normalizedMethod !== "HEAD") return false;
  return PUBLIC_READ_PATTERNS.some((pattern) => pattern.test(path));
}

export function isPublicContentDetailRequest(method: string, path: string) {
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
