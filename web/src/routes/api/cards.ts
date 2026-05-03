import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";

import {
  getBackgroundCardImages,
  getRandomContentTypeBackgrounds,
} from "@/server/cards";

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/cards")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const variant = url.searchParams.get("variant");
        const mode = url.searchParams.get("mode");

        if (variant === "content-types" || mode === "content-types") {
          try {
            return jsonResponse(getRandomContentTypeBackgrounds());
          } catch (error) {
            console.error("Error loading content type backgrounds:", error);
            return jsonResponse([]);
          }
        }

        try {
          return jsonResponse(getBackgroundCardImages());
        } catch (error) {
          console.error("Error loading background card images:", error);
          return jsonResponse([]);
        }
      },
    },
  },
});
