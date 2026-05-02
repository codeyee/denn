import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";

/**
 * Web Vitals ingestion endpoint.
 *
 * Receives one metric per request from the browser via
 * `navigator.sendBeacon`. The payload is intentionally not persisted:
 * we just emit a structured `console.log` so whatever runtime ships
 * stdout (Vercel, container logs) captures it.
 *
 * Stays cheap on purpose: no DB, no auth, no rate-limit. Worst case a
 * misbehaving client floods our logs — easy to mitigate later by
 * gating on a header or moving to an edge function.
 */
interface VitalPayload {
  event?: string;
  name?: string;
  value?: number;
  rating?: string;
  id?: string;
  route?: string;
  ts?: number;
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function isValidPayload(value: unknown): value is VitalPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as VitalPayload;
  return typeof v.name === "string" && typeof v.value === "number";
}

export const Route = createFileRoute("/api/perf/vitals")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return jsonResponse({ ok: false, error: "invalid_json" }, 400);
        }

        if (!isValidPayload(body)) {
          return jsonResponse({ ok: false, error: "invalid_shape" }, 400);
        }

        console.log(
          JSON.stringify({
            event: "web_vital",
            name: body.name,
            value: body.value,
            rating: body.rating,
            id: body.id,
            route: body.route,
            ts: body.ts ?? Date.now(),
          }),
        );

        return jsonResponse({ ok: true });
      },
    },
  },
});
