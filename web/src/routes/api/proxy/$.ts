import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";

import {
  buildProxyHeaders,
  generateRequestId,
  getProxyBaseUrl,
  normalizeRequestId,
} from "@/server/proxy";
import { resolveCatalogContentIds } from "@/server/catalog";
import type { BrowseResponse, HomepageResponse, MultiSearchResponse } from "@/lib/types";

function jsonResponse(data: unknown, status: number, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

export function isSafeProxyPath(path: string): boolean {
  if (!path || path.startsWith("/") || path.includes("\\")) return false;

  let decodedPath = path;
  try {
    while (true) {
      const nextPath = decodeURIComponent(decodedPath);
      if (nextPath === decodedPath) break;
      decodedPath = nextPath;
    }
  } catch {
    return false;
  }

  if (decodedPath.includes("\\") || decodedPath.includes("\0")) return false;
  return decodedPath.split("/").every((segment) => segment !== "." && segment !== "..");
}

export function buildProxyUrl(baseUrl: string, path: string, search: string): string {
  if (!isSafeProxyPath(path)) {
    throw new Error("Unsafe proxy path");
  }

  const base = new URL(baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  const target = new URL(path, base);
  const basePath = base.pathname.endsWith("/") ? base.pathname : `${base.pathname}/`;

  if (target.origin !== base.origin || !target.pathname.startsWith(basePath)) {
    throw new Error("Proxy path escaped its configured base URL");
  }

  target.search = search;
  return target.toString();
}

function normalizeCacheStatus(value: string | null): string | null {
  const normalized = value?.trim().toUpperCase();
  return normalized && ["HIT", "MISS", "STALE", "BYPASS"].includes(normalized)
    ? normalized
    : null;
}

export function isCatalogDiscoveryPath(path: string) {
  return path === "homepage" || path === "search" || isBrowsePath(path);
}

export function isBrowsePath(path: string) {
  return path === "browse";
}

export const Route = createFileRoute("/api/proxy/$")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const splat =
          (params as { _splat?: string })._splat ?? "";
        const incomingUrl = new URL(request.url);
        let url: string;

        try {
          url = buildProxyUrl(getProxyBaseUrl(), splat, incomingUrl.search);
        } catch {
          return jsonResponse(
            { error: "INVALID_PROXY_PATH", message: "Invalid proxy path" },
            400,
          );
        }

        const country = request.headers.get("x-user-country");
        const requestId =
          normalizeRequestId(request.headers.get("x-request-id")) ??
          generateRequestId();
        const headers = buildProxyHeaders(country, { requestId });
        const started = performance.now();

        try {
          const response = await fetch(url, { headers });
          const proxyData = (await response.json()) as
            | HomepageResponse
            | MultiSearchResponse
            | BrowseResponse;
          const durationMs =
            Math.round((performance.now() - started) * 100) / 100;
          const cacheStatus = normalizeCacheStatus(
            response.headers.get("x-cache"),
          );
          let data = proxyData;
          if (response.ok && isCatalogDiscoveryPath(splat)) {
            try {
              data = await resolveCatalogContentIds(
                proxyData,
                country,
                requestId,
              );
            } catch (error) {
              console.error(
                JSON.stringify({
                  ts: new Date().toISOString(),
                  level: "error",
                  msg: "catalog_identity_resolution_failed",
                  service: "web",
                  request_id: requestId,
                  path: `/api/proxy/${splat}`,
                  target_service: "core",
                  error:
                    error instanceof Error ? error.message : String(error),
                }),
              );
              return jsonResponse(
                {
                  error: "CATALOG_ID_RESOLUTION_FAILED",
                  message: "The catalog could not prepare stable content links.",
                  request_id: requestId,
                },
                502,
                { "X-Request-Id": requestId },
              );
            }
          }
          const body = JSON.stringify(data);

          console.log(
            JSON.stringify({
              ts: new Date().toISOString(),
              level: response.ok ? "info" : "warn",
              msg: "http_request",
              service: "web",
              request_id: requestId,
              method: "GET",
              path: "/api/proxy/*",
              target_service: "proxy",
              status: response.status,
              duration_ms: durationMs,
              payload_size_bytes: new TextEncoder().encode(body).byteLength,
              cache_status: cacheStatus ?? undefined,
            }),
          );

          return jsonResponse(data, response.status, {
            "X-Request-Id": requestId,
            ...(cacheStatus ? { "X-Cache": cacheStatus } : {}),
            "Server-Timing": `proxy;dur=${durationMs}${
              cacheStatus ? `;desc="${cacheStatus}"` : ""
            }`,
          });
        } catch (error) {
          const durationMs =
            Math.round((performance.now() - started) * 100) / 100;
          console.error(
            JSON.stringify({
              ts: new Date().toISOString(),
              level: "error",
              msg: "bff_proxy_unreachable",
              service: "web",
              request_id: requestId,
              path: "/api/proxy/*",
              target_service: "proxy",
              duration_ms: durationMs,
              error: error instanceof Error ? error.message : String(error),
            }),
          );
          return jsonResponse(
            {
              error: "BFF_PROXY_UNREACHABLE",
              message: "Failed to reach proxy server",
              request_id: requestId,
            },
            502,
            {
              "X-Request-Id": requestId,
              "Server-Timing": `proxy;dur=${durationMs};desc="unreachable"`,
            },
          );
        }
      },
    },
  },
});
