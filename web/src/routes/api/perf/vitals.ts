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
  browser_state?: string;
  navigation_type?: string;
}

const METRIC_NAMES = new Set(["CLS", "FCP", "INP", "LCP", "TTFB"]);
const METRIC_RATINGS = new Set(["good", "needs-improvement", "poor"]);
const BROWSER_STATES = new Set(["cold", "warm", "unknown"]);
const NAVIGATION_TYPES = new Set([
  "navigate",
  "reload",
  "back_forward",
  "prerender",
  "unknown",
]);
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
    && (v.browser_state === undefined ||
      (typeof v.browser_state === "string" &&
        BROWSER_STATES.has(v.browser_state)))
    && (v.navigation_type === undefined ||
      (typeof v.navigation_type === "string" &&
        NAVIGATION_TYPES.has(v.navigation_type)))
  );
}

export function normalizeMetricRoute(route?: string): string {
  if (!route?.startsWith("/")) return "/";
  const pathname = route.split("?")[0].replace(/\/+$/, "") || "/";
  if (/^\/content\/\d+$/.test(pathname)) return "/content/:id";
  if (/^\/lists\/\d+$/.test(pathname)) return "/lists/:id";
  if (
    ["/", "/login", "/register", "/search", "/profile", "/lists"].includes(
      pathname,
    )
  ) {
    return pathname;
  }
  return "/other";
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
            ts: new Date(body.ts ?? Date.now()).toISOString(),
            level: "info",
            msg: "web_vital",
            service: "web",
            name: body.name,
            value: body.value,
            rating: body.rating,
            route: normalizeMetricRoute(body.route),
            browser_state: body.browser_state ?? "unknown",
            navigation_type: body.navigation_type ?? "unknown",
          }),
        );

        return jsonResponse({ ok: true });
      },
    },
  },
});
