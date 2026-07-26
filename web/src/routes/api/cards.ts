import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";

import { getBackgroundCardImages } from "@/server/cards";

const CARD_MANIFEST_CACHE_CONTROL =
  "private, max-age=3600, stale-while-revalidate=86400";

function jsonResponse(
  data: unknown,
  status = 200,
  headers: HeadersInit = {},
) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

export const Route = createFileRoute("/api/cards")({
  server: {
    handlers: {
      GET: async () => {
        try {
          return jsonResponse(getBackgroundCardImages(), 200, {
            "cache-control": CARD_MANIFEST_CACHE_CONTROL,
          });
        } catch (error) {
          console.error("Error loading background card images:", error);
          return jsonResponse([], 200, { "cache-control": "no-store" });
        }
      },
    },
  },
});
