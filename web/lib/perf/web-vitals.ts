/**
 * Sprint 08 / T2 — Web Vitals reporter.
 *
 * Pure functions; the React glue lives in
 * `app/_components/common/WebVitalsReporter.tsx` so this module can be
 * unit-tested without importing any React/Next runtime.
 *
 * Behaviour:
 * - Development: pretty-print to console with one of three colours
 *   based on the official thresholds (good / needs-improvement / poor).
 * - Production: ship to `/api/perf/vitals` via `navigator.sendBeacon`
 *   so it survives page unload. Falls back to `fetch(..., { keepalive })`
 *   if `sendBeacon` is unavailable (old Safari, server-side calls,
 *   tests).
 *
 * The endpoint is intentionally minimal (it just `console.log`s the
 * payload structured) until Sprint 6C decides on observability.
 */

export type WebVitalName =
  | "CLS"
  | "FCP"
  | "FID"
  | "INP"
  | "LCP"
  | "TTFB";

export interface WebVitalMetric {
  name: WebVitalName | string;
  value: number;
  id?: string;
  rating?: "good" | "needs-improvement" | "poor";
  delta?: number;
}

const ENDPOINT = "/api/perf/vitals";

// Official Web Vitals thresholds (web.dev/articles/vitals).
// Unit: ms unless noted otherwise (CLS is unitless score).
const THRESHOLDS: Record<string, { good: number; poor: number }> = {
  LCP: { good: 2500, poor: 4000 },
  INP: { good: 200, poor: 500 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
};

export function classifyMetric(name: string, value: number): "good" | "needs-improvement" | "poor" {
  const t = THRESHOLDS[name];
  if (!t) return "needs-improvement";
  if (value <= t.good) return "good";
  if (value <= t.poor) return "needs-improvement";
  return "poor";
}

const COLORS: Record<string, string> = {
  good: "color: #16a34a; font-weight: 600",
  "needs-improvement": "color: #f59e0b; font-weight: 600",
  poor: "color: #dc2626; font-weight: 600",
};

export function reportWebVital(metric: WebVitalMetric, route: string): void {
  const rating = metric.rating ?? classifyMetric(metric.name, metric.value);
  const payload = {
    event: "web_vital",
    name: metric.name,
    value: Math.round(metric.value * 100) / 100,
    rating,
    id: metric.id,
    route,
    ts: Date.now(),
  };

  if (process.env.NODE_ENV === "development") {
    console.log(
      `%c[web-vital] ${payload.name} %c${payload.value}%c ${rating} %c(${route})`,
      "color: #6b7280",
      COLORS[rating],
      "color: #6b7280",
      "color: #6b7280; font-style: italic",
    );
    return;
  }

  if (typeof navigator === "undefined") return;

  const body = JSON.stringify(payload);
  if (typeof navigator.sendBeacon === "function") {
    try {
      const blob = new Blob([body], { type: "application/json" });
      const ok = navigator.sendBeacon(ENDPOINT, blob);
      if (ok) return;
    } catch {
      // fall through to fetch
    }
  }

  // Last-resort fetch with keepalive so the request survives unload.
  try {
    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // Swallow: never let perf telemetry crash the app.
  }
}
