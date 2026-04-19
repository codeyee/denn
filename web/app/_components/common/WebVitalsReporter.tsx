"use client";

import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";

import { reportWebVital, type WebVitalMetric } from "@/lib/perf/web-vitals";

/**
 * Sprint 08 / T2 — Web Vitals client glue.
 *
 * Mounted once at the layout level. `useReportWebVitals` registers a
 * single PerformanceObserver in the browser and fires the callback for
 * each Core Web Vital (LCP, INP, CLS, TTFB, FCP).
 *
 * We pass the current logical path so reports can be sliced by route
 * without parsing URLs server-side later.
 */
export function WebVitalsReporter() {
  const pathname = usePathname();
  useReportWebVitals((metric) => {
    reportWebVital(metric as WebVitalMetric, pathname || "/");
  });
  return null;
}
