import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";

export function healthResponse() {
  return new Response(
    JSON.stringify({
      service: "web",
      status: "ok",
    }),
    {
      status: 200,
      headers: {
        "cache-control": "no-store",
        "content-type": "application/json",
      },
    },
  );
}

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: () => healthResponse(),
    },
  },
});
