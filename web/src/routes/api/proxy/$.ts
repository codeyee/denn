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

export const Route = createFileRoute("/api/proxy/$")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const splat =
          (params as { _splat?: string })._splat ?? "";
        const incomingUrl = new URL(request.url);
        const url = `${getProxyBaseUrl()}/${splat}${incomingUrl.search}`;

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
