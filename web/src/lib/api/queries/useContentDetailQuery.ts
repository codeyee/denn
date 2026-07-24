import { useQuery } from "@tanstack/react-query";

import { contentItemActions } from "@/lib/api";
import { queryKeys } from "./keys";
import type { ContentItem } from "@/lib/types";

/**
 * Fetch a single ContentItem (by internal id) with its `source_data`
 * payload always hydrated (the `/api/content/<id>/` endpoint includes
 * it unconditionally).
 *
 * `staleTime: 5 minutes` because content metadata is effectively
 * immutable for a session. After Sprint 7 (local-first) lands we can
 * raise this to 30 minutes — the local Detail rows will own freshness
 * via the rehydration job.
 */
export function useContentDetailQuery(
  contentId: number,
  country?: string,
  initialData?: ContentItem,
  viewerId?: number,
) {
  const enabled = Number.isFinite(contentId) && contentId > 0;

  return useQuery({
    queryKey: queryKeys.contentDetail.byId(contentId, country, viewerId),
    queryFn: () => contentItemActions.get(contentId, country),
    enabled,
    initialData,
    staleTime: 5 * 60_000,
    retry: false,
  });
}
