
import { useCallback, useEffect, useRef } from "react";

interface HoverPrefetchOptions {
  /** Milliseconds the user must hover before we consider it "intent". */
  delayMs?: number;
  /** Whether prefetch should run; useful to gate on auth, network, etc. */
  enabled?: boolean;
}

interface HoverPrefetchHandlers {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onFocus: () => void;
  onBlur: () => void;
  onTouchStart: () => void;
}

/**
 * Sprint 08 / T8 — debounced hover-intent hook.
 *
 * Returns spread-ready handlers (`{...handlers}`) that fire `prefetch`
 * once the pointer dwells `delayMs` (default 200) on the element. Also
 * triggers on focus/touchstart so keyboard and touch users benefit.
 *
 * The hook owns its timer cleanup so unmounting mid-hover is safe.
 */
export function useHoverPrefetch(
  prefetch: () => void,
  options: HoverPrefetchOptions = {},
): HoverPrefetchHandlers {
  const { delayMs = 200, enabled = true } = options;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (!enabled || firedRef.current || timerRef.current !== null) return;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      firedRef.current = true;
      prefetch();
    }, delayMs);
  }, [delayMs, enabled, prefetch]);

  const stop = useCallback(() => {
    clear();
  }, [clear]);

  // immediate trigger for keyboard / touch users where 200 ms hover
  // doesn't really apply
  const startImmediate = useCallback(() => {
    if (!enabled || firedRef.current) return;
    clear();
    firedRef.current = true;
    prefetch();
  }, [clear, enabled, prefetch]);

  useEffect(() => clear, [clear]);

  return {
    onMouseEnter: start,
    onMouseLeave: stop,
    onFocus: startImmediate,
    onBlur: stop,
    onTouchStart: startImmediate,
  };
}
