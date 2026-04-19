import { useEffect, useState } from "react";
import { contentItemActions } from "@/lib/api";
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
}

interface UseContentDataReturn {
  loading: boolean;
  error: string | null;
  contentItem: ContentItem | null;
  detailData:
    | MovieDetail
    | TVShowDetail
    | TVSeasonDetail
    | AlbumDetail
    | GameDetail
    | BookDetail
    | null;
  tvShowTitle: string | null;
}

export function useContentData({
  contentId,
  country,
}: UseContentDataParams): UseContentDataReturn {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contentItem, setContentItem] = useState<ContentItem | null>(null);
  const [detailData, setDetailData] = useState<
    MovieDetail | TVShowDetail | TVSeasonDetail | AlbumDetail | GameDetail | BookDetail | null
  >(null);
  const [tvShowTitle, setTvShowTitle] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchContent = async () => {
      try {
        setLoading(true);
        setError(null);

        const item = await contentItemActions.get(contentId, country);
        if (cancelled) return;

        setContentItem(item);

        let sourceData:
          | MovieDetail | TVShowDetail | TVSeasonDetail | AlbumDetail | GameDetail | BookDetail
          | null = null;

        if (item.source_data) {
          sourceData =
            typeof item.source_data === "string"
              ? JSON.parse(item.source_data)
              : item.source_data;
        }

        if (sourceData) {
          setDetailData(sourceData);

          if (
            item.content_type === ContentType.SEASON &&
            "tv_show_name" in sourceData &&
            sourceData.tv_show_name
          ) {
            setTvShowTitle(sourceData.tv_show_name);
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Error fetching content:", err);
          setError(err instanceof Error ? err.message : "Failed to load content");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (Number.isFinite(contentId) && contentId > 0) {
      fetchContent();
    }

    return () => {
      cancelled = true;
    };
  }, [contentId, country]);

  return {
    loading,
    error,
    contentItem,
    detailData,
    tvShowTitle,
  };
}
