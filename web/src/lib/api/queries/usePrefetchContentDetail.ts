import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { contentItemActions } from "@/lib/api";
import { queryKeys } from "./keys";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Sprint 08 / T8 — prefetch helper for ContentDetail.
 *
 * Returns a stable callback that warms the React Query cache for
 * `useContentDetailQuery(id, country)`. The fetch is a no-op if the
 * cache already has fresh data thanks to TanStack's built-in
 * `prefetchQuery` deduplication.
 *
 * Intended to be wired to a `useHoverPrefetch` (200 ms intent) on
 * `ContentCard`/`ListItemCard`, so the network round-trip starts
 * before the user actually clicks.
 */
export function usePrefetchContentDetail() {
  const qc = useQueryClient();
  const viewerId = useAuthStore((state) =>
    state.sessionResolution === "authenticated" ? state.user?.id : undefined,
  );

  return useCallback(
    (id: number, country?: string) => {
      if (!Number.isFinite(id) || id <= 0) return;
      void qc.prefetchQuery({
        queryKey: queryKeys.contentDetail.byId(id, country, viewerId),
        queryFn: () => contentItemActions.get(id, country),
        staleTime: 5 * 60_000,
      });
    },
    [qc, viewerId],
  );
}
