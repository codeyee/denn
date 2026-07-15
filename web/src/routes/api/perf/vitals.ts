import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";

import {
  createFixedWindowRateLimiter,
  readLimitedJson,
  RequestBodyTooLargeError,
} from "@/server/request-security";

/**
 * Web Vitals ingestion endpoint.
 *
 * Receives one metric per request from the browser via
 * `navigator.sendBeacon`. The payload is intentionally not persisted:
 * we just emit a structured `console.log` so whatever runtime ships
 * stdout (Vercel, container logs) captures it.
 *
 * Stays cheap on purpose: no DB and no auth. Payload size and request volume
 * are bounded because this endpoint is public and writes directly to logs.
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

const METRIC_NAMES = new Set(["CLS", "FCP", "INP", "LCP", "TTFB"]);
const METRIC_RATINGS = new Set(["good", "needs-improvement", "poor"]);
const vitalsRateLimiter = createFixedWindowRateLimiter({
  limit: 300,
  windowMs: 60_000,
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function isValidPayload(value: unknown): value is VitalPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as VitalPayload;
  return (
    typeof v.name === "string" &&
    METRIC_NAMES.has(v.name) &&
    typeof v.value === "number" &&
    Number.isFinite(v.value) &&
    v.value >= 0 &&
    v.value <= 600_000 &&
    (v.rating === undefined ||
      (typeof v.rating === "string" && METRIC_RATINGS.has(v.rating))) &&
    (v.id === undefined || (typeof v.id === "string" && v.id.length <= 128)) &&
    (v.route === undefined ||
      (typeof v.route === "string" &&
        v.route.startsWith("/") &&
        v.route.length <= 512)) &&
    (v.ts === undefined || (typeof v.ts === "number" && Number.isFinite(v.ts)))
  );
}

export const Route = createFileRoute("/api/perf/vitals")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!vitalsRateLimiter.consume()) {
          return jsonResponse({ ok: false, error: "rate_limited" }, 429);
        }

        let body: unknown;
        try {
          body = await readLimitedJson(request);
        } catch (error) {
          if (error instanceof RequestBodyTooLargeError) {
            return jsonResponse({ ok: false, error: "payload_too_large" }, 413);
          }
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
