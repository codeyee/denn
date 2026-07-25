import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";

import { getBackgroundCardImages } from "@/server/cards";

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/cards")({
  server: {
    handlers: {
      GET: async () => {
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
