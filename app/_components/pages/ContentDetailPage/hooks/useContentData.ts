import { useEffect, useState } from "react";
import { contentItemActions, videoActions, musicActions } from "@/lib/api";
import {
  ContentItem,
  ContentType,
  SourceApi,
  MovieDetail,
  TVShowDetail,
  TVSeasonDetail,
  AlbumDetail,
  GameDetail,
  BookDetail
} from "@/lib/types";

interface UseContentDataParams {
  contentId?: number;
  externalId?: string;
  sourceApi?: string;
  contentType?: string;
}

interface UseContentDataReturn {
  loading: boolean;
  error: string | null;
  contentItem: ContentItem | null;
  detailData: MovieDetail | TVShowDetail | TVSeasonDetail | AlbumDetail | GameDetail | BookDetail | null;
  tvShowTitle: string | null;
}

export function useContentData({
  contentId,
  externalId,
  sourceApi,
  contentType: contentTypeStr
}: UseContentDataParams): UseContentDataReturn {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contentItem, setContentItem] = useState<ContentItem | null>(null);
  const [detailData, setDetailData] = useState<MovieDetail | TVShowDetail | TVSeasonDetail | AlbumDetail | GameDetail | BookDetail | null>(null);
  const [tvShowTitle, setTvShowTitle] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        setError(null);

        let item: ContentItem;

        if (contentId) {
          item = await contentItemActions.get(contentId);
        } else if (externalId && sourceApi && contentTypeStr) {
          item = await contentItemActions.getOrCreate(
            sourceApi as SourceApi,
            externalId,
            contentTypeStr as ContentType
          );
        } else {
          throw new Error("Missing required identifiers");
        }

        setContentItem(item);

        let sourceData: MovieDetail | TVShowDetail | TVSeasonDetail | AlbumDetail | GameDetail | BookDetail | null = null;
        if (item.source_data) {
          sourceData = typeof item.source_data === 'string'
            ? JSON.parse(item.source_data)
            : item.source_data;
        }

        if (sourceData) {
          setDetailData(sourceData);

          if (item.content_type === ContentType.SEASON && "tv_show_name" in sourceData && sourceData.tv_show_name) {
            setTvShowTitle(sourceData.tv_show_name);
          }
        } else {
          const { content_type, source_api, external_id } = item;

          if (content_type === ContentType.MOVIE && source_api === SourceApi.TMDB) {
            const movieDetail = await videoActions.getMovie(parseInt(external_id));
            setDetailData(movieDetail);
          } else if (content_type === ContentType.TV_SHOW && source_api === SourceApi.TMDB) {
            const tvDetail = await videoActions.getTVShow(parseInt(external_id));
            setDetailData(tvDetail);
          } else if (content_type === ContentType.SEASON && source_api === SourceApi.TMDB) {
            const [tvIdStr, seasonNumberStr] = external_id.split(":");
            const tvId = parseInt(tvIdStr);
            const seasonNumber = parseInt(seasonNumberStr);

            if (!isNaN(tvId) && !isNaN(seasonNumber)) {
              const seasonDetail = await videoActions.getTVSeason(tvId, seasonNumber);
              setDetailData(seasonDetail);

              if (seasonDetail.tv_show_name) {
                setTvShowTitle(seasonDetail.tv_show_name);
              } else {
                try {
                  const tvShow = await videoActions.getTVShow(tvId);
                  setTvShowTitle(tvShow.title);
                } catch (error) {
                  console.warn("Could not fetch TV show title:", error);
                }
              }
            }
          } else if (content_type === ContentType.ALBUM && source_api === SourceApi.SPOTIFY) {
            const albumDetail = await musicActions.getAlbum(external_id);
            setDetailData(albumDetail);
          } else if (content_type === ContentType.GAME && source_api === SourceApi.IGDB) {
            console.warn("Game detail data not available in source_data");
          } else if (content_type === ContentType.BOOK && source_api === SourceApi.OPENLIBRARY) {
            console.warn("Book detail data not available in source_data");
          }
        }
      } catch (err) {
        console.error("Error fetching content:", err);
        setError(err instanceof Error ? err.message : "Failed to load content");
      } finally {
        setLoading(false);
      }
    };

    if (contentId || (externalId && sourceApi && contentTypeStr)) {
      fetchContent();
    }
  }, [contentId, externalId, sourceApi, contentTypeStr]);

  return {
    loading,
    error,
    contentItem,
    detailData,
    tvShowTitle
  };
}
