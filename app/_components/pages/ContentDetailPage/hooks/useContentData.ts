import { useEffect, useState } from "react";
import { contentItemActions, videoActions, musicActions } from "@/lib/api";
import { gameActions, bookActions } from "@/lib/api/actions";
import { getSourceApi } from "@/lib/utils/contentTypeUtils";
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
        } else if (externalId && contentTypeStr) {
          item = await contentItemActions.getOrCreate(
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
          const { content_type, external_id } = item;
          const correctSourceApi = getSourceApi(content_type);

          if (content_type === ContentType.MOVIE && correctSourceApi === SourceApi.TMDB) {
            const movieDetail = await videoActions.getMovie(external_id);
            setDetailData(movieDetail);
          } else if (content_type === ContentType.TV_SHOW && correctSourceApi === SourceApi.TMDB) {
            const tvDetail = await videoActions.getTVShow(external_id);
            setDetailData(tvDetail);
          } else if (content_type === ContentType.SEASON && correctSourceApi === SourceApi.TMDB) {
            const [tvIdStr, seasonNumberStr] = external_id.split(":");
            const seasonNumber = parseInt(seasonNumberStr);

            if (tvIdStr && !isNaN(seasonNumber)) {
              const seasonDetail = await videoActions.getTVSeason(tvIdStr, seasonNumber);
              setDetailData(seasonDetail);

              if (seasonDetail.tv_show_name) {
                setTvShowTitle(seasonDetail.tv_show_name);
              } else {
                try {
                  const tvShow = await videoActions.getTVShow(tvIdStr);
                  setTvShowTitle(tvShow.title);
                } catch (error) {
                  console.warn("Could not fetch TV show title:", error);
                }
              }
            }
          } else if (content_type === ContentType.ALBUM && correctSourceApi === SourceApi.SPOTIFY) {
            const albumDetail = await musicActions.getAlbum(external_id);
            setDetailData(albumDetail);
          } else if (content_type === ContentType.GAME && correctSourceApi === SourceApi.IGDB) {
            const gameDetail = await gameActions.getGame(external_id);
            setDetailData(gameDetail);
          } else if (content_type === ContentType.BOOK && correctSourceApi === SourceApi.OPENLIBRARY) {
            const bookDetail = await bookActions.getBook(external_id);
            setDetailData(bookDetail);
          }
        }
      } catch (err) {
        console.error("Error fetching content:", err);
        setError(err instanceof Error ? err.message : "Failed to load content");
      } finally {
        setLoading(false);
      }
    };

    if (contentId || (externalId && contentTypeStr)) {
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
