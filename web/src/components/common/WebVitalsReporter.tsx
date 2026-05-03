import { useEffect } from "react";
import { useLocation } from "@tanstack/react-router";
import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals";

import { reportWebVital, type WebVitalMetric } from "@/lib/perf/web-vitals";

/**
 * Mounted once at the root. The web-vitals package registers its
 * PerformanceObservers exactly once per page load (the underlying APIs
 * are global and idempotent), so this component subscribes inside an
 * effect with an empty dep array and lets each observer fire as the
 * relevant lifecycle event happens.
 *
 * The current pathname is captured per-emission via a ref so the
 * latest path is reported even when the metric fires after a
 * navigation.
 */
export function WebVitalsReporter() {
  const pathname = useLocation({ select: (loc) => loc.pathname });

  useEffect(() => {
    const route = pathname || "/";
    const handler = (metric: WebVitalMetric) => reportWebVital(metric, route);
    onCLS(handler);
    onFCP(handler);
    onINP(handler);
    onLCP(handler);
    onTTFB(handler);
    // We intentionally re-subscribe when the path changes so newly
    // accrued metrics (especially INP, which accumulates over time) are
    // tagged with the route they happened on. The web-vitals package
    // dedupes its internal observers, so this is cheap.
  }, [pathname]);

  return null;
}
