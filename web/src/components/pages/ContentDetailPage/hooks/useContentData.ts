import { useMemo } from "react";

import { useContentDetailQuery } from "@/lib/api/queries";
import {
  ContentItem,
  ContentType,
  MovieDetail,
  TVShowDetail,
  TVSeasonDetail,
  AlbumDetail,
  GameDetail,
  BookDetail,
} from "@/lib/types";

interface UseContentDataParams {
  contentId: number;
  country?: string;
  initialData?: ContentItem;
}

type DetailPayload =
  | MovieDetail
  | TVShowDetail
  | TVSeasonDetail
  | AlbumDetail
  | GameDetail
  | BookDetail
  | null;

interface UseContentDataReturn {
  loading: boolean;
  error: string | null;
  contentItem: ContentItem | null;
  detailData: DetailPayload;
  tvShowTitle: string | null;
}

/**
 * Sprint 08 / T6 — Migrated from a hand-rolled `useEffect` fetch to
 * `useContentDetailQuery`. The return shape is preserved so callers
 * (`ContentDetailPage` and friends) do not need to change.
 *
 * Side benefits:
 * - The page now hydrates instantly when the detail was prefetched
 *   on hover (T8).
 * - Re-mounting the page (e.g. dialog → close → reopen) hits the
 *   cache for `staleTime` (5 minutes) instead of refetching.
 */
export function useContentData({
  contentId,
  country,
  initialData,
}: UseContentDataParams): UseContentDataReturn {
  const query = useContentDetailQuery(contentId, country, initialData);

  const item = query.data ?? null;

  const detailData = useMemo<DetailPayload>(() => {
    if (!item?.source_data) return null;
    if (typeof item.source_data === "string") {
      try {
        return JSON.parse(item.source_data) as DetailPayload;
      } catch {
        return null;
      }
    }
    return item.source_data as DetailPayload;
  }, [item]);

  const tvShowTitle = useMemo(() => {
    if (!item || item.content_type !== ContentType.SEASON) return null;
    if (
      detailData &&
      "tv_show_name" in detailData &&
      typeof detailData.tv_show_name === "string"
    ) {
      return detailData.tv_show_name;
    }
    return null;
  }, [item, detailData]);

  return {
    loading: query.isLoading,
    error: query.error
      ? query.error instanceof Error
        ? query.error.message
        : "Failed to load content"
      : null,
    contentItem: item,
    detailData,
    tvShowTitle,
  };
}
