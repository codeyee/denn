import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { ReactNode } from "react";

interface QueryProviderProps {
  client: QueryClient;
  children: ReactNode;
}

/**
 * Provides the TanStack Query context for the app. The client is created
 * once per request inside `src/router.tsx` and passed through both the
 * router context (so loaders can call `ensureQueryData`) and this provider
 * (so components can call `useQuery` / `useSuspenseQuery`). The router
 * dehydrates and rehydrates the client across the SSR boundary.
 *
 * Default options match the previous Next.js setup:
 * - staleTime 30s dedupes rapid re-renders without going stale.
 * - gcTime 5 min keeps cached data warm during brief navigations.
 * - refetchOnWindowFocus off because the upstream proxy is chatty.
 * - retry 1 swallows single transient failures.
 */
export function buildQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

export function QueryProvider({ client, children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={client}>
      {children}
      {import.meta.env.DEV ? (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      ) : null}
    </QueryClientProvider>
  );
}
