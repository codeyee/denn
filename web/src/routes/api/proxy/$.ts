import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";

import {
  buildProxyHeaders,
  generateRequestId,
  getProxyBaseUrl,
} from "@/server/proxy";

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
          request.headers.get("x-request-id") ?? generateRequestId();
        const headers = buildProxyHeaders(country, { requestId });

        try {
          const response = await fetch(url, { headers });
          const data = await response.json();
          return jsonResponse(data, response.status, {
            "X-Request-Id": requestId,
          });
        } catch (error) {
          console.error(
            JSON.stringify({
              level: "error",
              msg: "bff_proxy_unreachable",
              request_id: requestId,
              url,
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
            { "X-Request-Id": requestId },
          );
        }
      },
    },
  },
});
