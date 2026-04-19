"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";

/**
 * Sprint 08 / T6 — TanStack Query provider.
 *
 * The defaults are intentionally conservative:
 * - `staleTime: 30s`        → enough to dedupe rapid re-renders, short
 *                              enough to feel fresh after navigation.
 * - `gcTime: 5min`          → cached responses survive backgrounding /
 *                              navigating away briefly.
 * - `refetchOnWindowFocus`  → off; chatty servers + flaky proxy means
 *                              the noise/cost outweighs the value. We
 *                              opt in per-resource where it matters.
 * - `retry: 1`              → one retry hides transient blips without
 *                              hammering the upstream during outages.
 *
 * Per-resource overrides live in `lib/api/queries/*` so each hook can
 * tune `staleTime` to its data's volatility (e.g. content detail is
 * effectively immutable, lists change often).
 *
 * The `useState(() => new QueryClient(...))` pattern is mandatory in
 * App Router: it ensures the client is created once per browser tab,
 * never re-created across re-renders, and is brand-new across server
 * requests (no shared cache between users).
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      {children}
      {process.env.NODE_ENV === "development" ? (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      ) : null}
    </QueryClientProvider>
  );
}
