"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { contentItemActions, videoActions, musicActions, gameActions, bookActions } from "@/lib/api";
import { ContentType, SourceApi } from "@/lib/api/types";
import { 
  MovieDetail, 
  TVShowDetail, 
  AlbumDetail, 
  GameDetail, 
  BookDetail 
} from "@/lib/api/types";
import ContentBanner from "./ContentBanner";
import MovieDetailContent from "./MovieDetailContent";
import TVShowDetailContent from "./TVShowDetailContent";
import AlbumDetailContent from "./AlbumDetailContent";
import GameDetailContent from "./GameDetailContent";
import BookDetailContent from "./BookDetailContent";

interface ContentDetailPageProps {
  contentId?: number;
  externalId?: string;
  sourceApi?: string;
  contentType?: string;
}

export default function ContentDetailPage({ 
  contentId,
  externalId,
  sourceApi,
  contentType: contentTypeStr
}: ContentDetailPageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contentItem, setContentItem] = useState<any>(null);
  const [detailData, setDetailData] = useState<MovieDetail | TVShowDetail | AlbumDetail | GameDetail | BookDetail | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        setError(null);

        let item: any;

        // If we have an internal content ID, fetch directly with source data
        if (contentId) {
          item = await contentItemActions.get(contentId, true);
        }
        // Otherwise, use external identifiers to get or create
        else if (externalId && sourceApi && contentTypeStr) {
          // Use get_or_create directly with render_source=true to get detailed data
          // This avoids the need for a separate API call to fetch source_data
          item = await contentItemActions.getOrCreate(
            sourceApi as SourceApi,
            externalId,
            contentTypeStr as ContentType,
            true // render_source=true to get detailed data in source_data
          );
        } else {
          throw new Error("Missing required identifiers");
        }

        setContentItem(item);

        // Parse source_data if it's a string
        let sourceData: any = null;
        if (item.source_data) {
          sourceData = typeof item.source_data === 'string'
            ? JSON.parse(item.source_data)
            : item.source_data;
        }

        // Use source_data if available (from render_source=true), otherwise fetch from proxy API
        // This avoids redundant API calls when source_data is already populated
        if (sourceData) {
          // Use the detailed data from source_data
          setDetailData(sourceData);
        } else {
          // Fallback: only fetch from proxy API if source_data is not available
          const { content_type, source_api, external_id } = item;

          if (content_type === ContentType.MOVIE && source_api === SourceApi.TMDB) {
            const movieDetail = await videoActions.getMovie(parseInt(external_id));
            setDetailData(movieDetail);
          } else if (content_type === ContentType.TV_SHOW && source_api === SourceApi.TMDB) {
            const tvDetail = await videoActions.getTVShow(parseInt(external_id));
            setDetailData(tvDetail);
          } else if (content_type === ContentType.ALBUM && source_api === SourceApi.SPOTIFY) {
            const albumDetail = await musicActions.getAlbum(external_id);
            setDetailData(albumDetail);
          } else if (content_type === ContentType.GAME && source_api === SourceApi.IGDB) {
            // For games, use source_data if available, otherwise data might not be available
            console.warn("Game detail data not available in source_data");
          } else if (content_type === ContentType.BOOK && source_api === SourceApi.OPENLIBRARY) {
            // For books, use source_data if available, otherwise data might not be available
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

  if (loading) {
    return (
      <div className="relative w-full min-h-screen bg-background-logged-in">
        <div className="container mx-auto px-4 py-20">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-gray-400">Loading content...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !contentItem) {
    return (
      <div className="relative w-full min-h-screen bg-background-logged-in">
        <div className="container mx-auto px-4 py-20">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-red-400 text-xl mb-4">Error loading content</p>
              <p className="text-gray-400 mb-4">{error || "Content not found"}</p>
              <button
                onClick={() => router.back()}
                className="text-white/80 hover:text-white underline"
              >
                Go back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Determine which detail component to render
  const renderDetailContent = () => {
    if (!detailData) {
      // Fallback: show basic info from contentItem
      return (
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white/5 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Content Details</h2>
            <p className="text-gray-400">Detailed information not available.</p>
          </div>
        </div>
      );
    }

    const contentType = contentItem.content_type;

    if (contentType === ContentType.MOVIE) {
      return <MovieDetailContent movie={detailData as MovieDetail} />;
    } else if (contentType === ContentType.TV_SHOW) {
      return <TVShowDetailContent tvShow={detailData as TVShowDetail} />;
    } else if (contentType === ContentType.ALBUM) {
      return <AlbumDetailContent album={detailData as AlbumDetail} />;
    } else if (contentType === ContentType.GAME) {
      return <GameDetailContent game={detailData as GameDetail} />;
    } else if (contentType === ContentType.BOOK) {
      return <BookDetailContent book={detailData as BookDetail} />;
    }

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white/5 rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Content Details</h2>
          <p className="text-gray-400">Content type not supported.</p>
        </div>
      </div>
    );
  };

  // Use detailData if available, otherwise fallback to contentItem source_data
  const displayItem = detailData || (contentItem.source_data 
    ? (typeof contentItem.source_data === 'string' 
        ? JSON.parse(contentItem.source_data) 
        : contentItem.source_data)
    : contentItem);

  return (
    <div className="relative w-full min-h-screen bg-background-logged-in">
      <div className="pt-30 pb-20">
        {/* Banner Section */}
        <section className="-mt-30 mb-6 md:mb-10 relative z-0">
          <ContentBanner item={displayItem} />
        </section>

        {/* Detail Content Section */}
        {renderDetailContent()}
      </div>

      {/* Bottom gradient */}
      <div className="pointer-events-none fixed left-0 right-0 bottom-0 h-16 bg-bottom-gradient z-10" />
    </div>
  );
}

