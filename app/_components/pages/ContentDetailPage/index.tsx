"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { contentItemActions, videoActions, musicActions, ratingActions } from "@/lib/api";
import { ContentItem, ContentType, SourceApi, Rating, RatingCreate, ImageType, TVSeason } from "@/lib/api/types";
import { getAuthorNames } from "@/lib/utils/authorUtils";
import {
  MovieDetail,
  TVShowDetail,
  TVSeasonDetail,
  AlbumDetail,
  GameDetail,
  BookDetail
} from "@/lib/api/types";
import { useAuthStore } from "@/app/_stores/auth-store";
import { ContentBanner } from "./ContentBanner";
import { MovieDetailContent } from "./MovieDetailContent";
import { TVShowDetailContent } from "./TVShowDetailContent";
import { SeasonDetailContent } from "./SeasonDetailContent";
import { GameDetailContent } from "./GameDetailContent";
import { BookDetailContent } from "./BookDetailContent";
import { RatingsSection } from "./RatingsSection";
import { RatingModal } from "@/app/_components/common/modals/RatingModal";
import { AddToListModal } from "@/app/_components/common/modals/AddToListModal";
import { Star } from "lucide-react";
import { Footer } from "../../layout/Footer";
import { formatReleaseDate } from "@/lib/utils/dateUtils";
import { VerticalList } from "@/app/_components/common/lists/VerticalList";
import { TrackListItem } from "@/app/_components/common/lists/TrackListItem";
import { Carousel } from "@/app/_components/common/ui/Carousel";
import { ContentCard } from "@/app/_components/cards/ContentCard";
import { Content } from "@/types";

interface ContentDetailPageProps {
  contentId?: number;
  externalId?: string;
  sourceApi?: string;
  contentType?: string;
}

export function ContentDetailPage({
  contentId,
  externalId,
  sourceApi,
  contentType: contentTypeStr
}: ContentDetailPageProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contentItem, setContentItem] = useState<ContentItem | null>(null);
    const [detailData, setDetailData] = useState<MovieDetail | TVShowDetail | TVSeasonDetail | AlbumDetail | GameDetail | BookDetail | null>(null);  const [tvShowTitle, setTvShowTitle] = useState<string | null>(null);
  const [userRating, setUserRating] = useState<Rating | null>(null);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [isRatingLoading, setIsRatingLoading] = useState(false);
  const [ratingRefreshKey, setRatingRefreshKey] = useState(0);
  const [isAddToListModalOpen, setIsAddToListModalOpen] = useState(false);
  const userRatingFetchRef = useRef<{ contentItemId: number | null; userId: number | null }>({ contentItemId: null, userId: null });

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        setError(null);

        let item: ContentItem;

        // If we have an internal content ID, fetch directly with source data
        if (contentId) {
          item = await contentItemActions.get(contentId);
        }
        // Otherwise, use external identifiers to get or create
        else if (externalId && sourceApi && contentTypeStr) {
          // Use get_or_create to ensure the content item exists in our database
          item = await contentItemActions.getOrCreate(
            sourceApi as SourceApi,
            externalId,
            contentTypeStr as ContentType
          );
        } else {
          throw new Error("Missing required identifiers");
        }

        setContentItem(item);

        // Parse source_data if it's a string
        let sourceData: MovieDetail | TVShowDetail | TVSeasonDetail | AlbumDetail | GameDetail | BookDetail | null = null;
        if (item.source_data) {
          sourceData = typeof item.source_data === 'string'
            ? JSON.parse(item.source_data)
            : item.source_data;
        }

        if (sourceData) {
          setDetailData(sourceData);

          // For seasons, extract TV show name from source_data if available
          if (item.content_type === ContentType.SEASON && "tv_show_name" in sourceData && sourceData.tv_show_name) {
            setTvShowTitle(sourceData.tv_show_name);
          }
        } else {
          // Fallback: only fetch from proxy API if source_data is not available
          const { content_type, source_api, external_id } = item;

          if (content_type === ContentType.MOVIE && source_api === SourceApi.TMDB) {
            const movieDetail = await videoActions.getMovie(parseInt(external_id));
            setDetailData(movieDetail);
          } else if (content_type === ContentType.TV_SHOW && source_api === SourceApi.TMDB) {
            const tvDetail = await videoActions.getTVShow(parseInt(external_id));
            setDetailData(tvDetail);
          } else if (content_type === ContentType.SEASON && source_api === SourceApi.TMDB) {
            // Parse external_id format: "tv_id:season_number"
            const [tvIdStr, seasonNumberStr] = external_id.split(":");
            const tvId = parseInt(tvIdStr);
            const seasonNumber = parseInt(seasonNumberStr);

            if (!isNaN(tvId) && !isNaN(seasonNumber)) {
              // Fetch season details
              const seasonDetail = await videoActions.getTVSeason(tvId, seasonNumber);
              setDetailData(seasonDetail);

              // Extract TV show name from season detail if available
              if (seasonDetail.tv_show_name) {
                setTvShowTitle(seasonDetail.tv_show_name);
              } else {
                // Fallback: only fetch TV show if tv_show_name is not in season detail
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

  // Separate effect to fetch user rating when contentItem changes
  useEffect(() => {
    const fetchUserRating = async () => {
      if (!contentItem?.id || !user?.id) {
        setUserRating(null);
        userRatingFetchRef.current = { contentItemId: null, userId: null };
        return;
      }

      // Prevent duplicate calls for the same contentItem and user
      if (userRatingFetchRef.current.contentItemId === contentItem.id &&
        userRatingFetchRef.current.userId === user.id) {
        return;
      }

      // Mark as fetching
      userRatingFetchRef.current = { contentItemId: contentItem.id, userId: user.id };

      try {
        const ratingsResponse = await ratingActions.list({
          content_item_id: contentItem.id,
          user_id: user.id,
          page_size: 1,
        });
        // Verify we're still fetching the same contentItem/user combination
        if (userRatingFetchRef.current.contentItemId === contentItem.id &&
          userRatingFetchRef.current.userId === user.id) {
          if (ratingsResponse.results.length > 0) {
            setUserRating(ratingsResponse.results[0]);
          } else {
            setUserRating(null);
          }
        }
      } catch (err) {
        console.warn("Could not fetch user rating:", err);
        // Only set to null if we're still fetching the same contentItem/user
        if (userRatingFetchRef.current.contentItemId === contentItem.id &&
          userRatingFetchRef.current.userId === user.id) {
          setUserRating(null);
        }
      }
    };

    fetchUserRating();
  }, [contentItem?.id, user?.id]);

  if (loading) {
    return (
      <div className="relative w-full min-h-screen bg-background-logged-in">
        <div className="container mx-auto px-4 mt-8 py-20">
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
        <div className="container mx-auto px-4 mt-8 py-20">
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

  // Render About section only
  const renderAboutSection = () => {
    if (!detailData) {
      return (
        <div className="container mx-auto px-4 mt-8">
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-6">Content Details</h2>
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
    } else if (contentType === ContentType.SEASON) {
      return (
        <SeasonDetailContent
          season={detailData as TVSeasonDetail}
          contentItem={contentItem}
          userRating={userRating}
          onEditRating={() => setIsRatingModalOpen(true)}
          onDeleteRating={handleDeleteRating}
          isRatingLoading={isRatingLoading}
          user={user}
        />
      );
    } else if (contentType === ContentType.ALBUM) {
      // Extract About section from AlbumDetailContent
      const album = detailData as AlbumDetail;
      const releaseDate = formatReleaseDate(album.release_date);
      return (
        <div className="container mx-auto px-4 mt-8">
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-6">About</h2>
            <div className="mt-6 space-y-2">
              {releaseDate && (
                <div>
                  <span className="text-white/60 font-bold">Release Date:</span>
                  <span className="text-white ml-2 font-sans">{releaseDate}</span>
                </div>
              )}
              {album.album_type && (
                <div>
                  <span className="text-white/60 font-bold">Type:</span>
                  <span className="text-white ml-2 capitalize font-sans">{album.album_type}</span>
                </div>
              )}
              {album.total_tracks !== undefined && (
                <div>
                  <span className="text-white/60 font-bold">Tracks:</span>
                  <span className="text-white ml-2 font-sans">{album.total_tracks}</span>
                </div>
              )}
              {album.duration_minutes !== undefined && album.duration_minutes !== null && (
                <div>
                  <span className="text-white/60 font-bold">Duration:</span>
                  <span className="text-white ml-2 font-sans">
                    {Math.floor(album.duration_minutes)} minutes
                  </span>
                </div>
              )}
            </div>
            {album.external_url && (
              <div className="mt-6">
                <a
                  href={album.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <Image
                    src="/images/logos/spotify.svg"
                    alt="Spotify"
                    width={28}
                    height={28}
                    className="h-7 w-auto"
                  />
                </a>
              </div>
            )}
          </div>
        </div>
      );
    } else if (contentType === ContentType.GAME) {
      return <GameDetailContent game={detailData as GameDetail} />;
    } else if (contentType === ContentType.BOOK) {
      return <BookDetailContent book={detailData as BookDetail} />;
    }

    return (
      <div className="container mx-auto px-4 mt-8">
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-white mb-6">Content Details</h2>
          <p className="text-gray-400">Content type not supported.</p>
        </div>
      </div>
    );
  };

  // Render tracks section for albums
  const renderTracksSection = () => {
    if (contentItem?.content_type !== ContentType.ALBUM || !detailData) return null;
    const album = detailData as AlbumDetail;
    if (!album.tracks || album.tracks.length === 0) return null;

    const formatDuration = (seconds: number | null): string => {
      if (!seconds) return "";
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    return (
      <div className="container mx-auto px-4 mt-8">
        <h2 className="text-2xl font-bold text-white mb-6">Tracks</h2>
        <VerticalList spacing="md">
          {album.tracks.map((track) => (
            <TrackListItem
              key={track.id}
              trackNumber={track.track_number}
              title={track.title}
              artists={track.authors ? getAuthorNames(track.authors) : undefined}
              duration={
                track.duration_seconds
                  ? formatDuration(track.duration_seconds)
                  : undefined
              }
              externalUrl={track.external_url || undefined}
              image={album.image_url || null}
            />
          ))}
        </VerticalList>
      </div>
    );
  };

  // Render gallery section for movies, TV shows, and games
  const renderGallerySection = () => {
    if (!detailData) return null;

    const contentType = contentItem.content_type;

    // No gallery for seasons
    if (contentType === ContentType.SEASON) return null;

    let galleryImages: { src: string; alt: string }[] = [];
    let title = "";

    if (contentType === ContentType.MOVIE) {
      const movie = detailData as MovieDetail;
      title = movie.title;
      galleryImages = movie.images
        ? Array.from(
            new Map(
              movie.images
                .filter(img => img.type === ImageType.GALLERY && img.size === "STANDARD")
                .map(img => [img.image_url, img])
            ).values()
          ).map((img, index) => ({
            src: img.image_url,
            alt: `${title} gallery image ${index + 1}`,
          }))
        : [];
    } else if (contentType === ContentType.TV_SHOW) {
      const tvShow = detailData as TVShowDetail;
      title = tvShow.title;
      galleryImages = tvShow.images
        ? Array.from(
            new Map(
              tvShow.images
                .filter(img => img.type === ImageType.GALLERY && img.size === "STANDARD")
                .map(img => [img.image_url, img])
            ).values()
          ).map((img, index) => ({
            src: img.image_url,
            alt: `${title} gallery image ${index + 1}`,
          }))
        : [];
    } else if (contentType === ContentType.GAME) {
      const game = detailData as GameDetail;
      title = game.title;
      galleryImages = game.images
        ? Array.from(
            new Map(
              game.images
                .filter(img => img.type === ImageType.GALLERY && img.size === "STANDARD")
                .map(img => [img.image_url, img])
            ).values()
          ).map((img, index) => ({
            src: img.image_url,
            alt: `${title} gallery image ${index + 1}`,
          }))
        : [];
    }

    if (galleryImages.length === 0) return null;

    return (
      <div className="container mx-auto px-4 mt-8">
        <h2 className="text-2xl font-bold text-white mb-6">Gallery</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {galleryImages.map((image, index) => (
            <div
              key={index}
              className="relative overflow-hidden rounded-2xl"
              style={{ aspectRatio: "16 / 9" }}
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render seasons section for TV shows
  const renderSeasonsSection = () => {
    if (contentItem?.content_type !== ContentType.TV_SHOW || !detailData) return null;
    const tvShow = detailData as TVShowDetail;
    if (!tvShow.seasons || tvShow.seasons.length === 0) return null;

    const createSeasonItem = (season: TVSeason) => {
      const externalId = `${tvShow.id}:${season.season_number}`;
      return {
        id: externalId,
        title: season.title || `Season ${season.season_number}`,
        image_url: season.image_url,
        release_date: season.release_date,
        number_of_episodes: season.number_of_episodes,
        description: season.description,
        tv_show_name: tvShow.title,
        type: "SEASON" as const,
        external_id: externalId,
        source_api: SourceApi.TMDB,
        content_type: ContentType.SEASON,
      };
    };

    return (
      <div className="mt-8">
        <Carousel
          title="Seasons"
          itemsPerView={undefined}
          targetCardWidth={250}
        >
          {tvShow.seasons.map((season) => {
            const seasonItem = createSeasonItem(season);
            return (
              <ContentCard
                key={season.id}
                item={{
                  ...seasonItem,
                  release_date:
                    seasonItem.release_date === null
                      ? undefined
                      : seasonItem.release_date,
                } as unknown as Content}
              />
            );
          })}
        </Carousel>
      </div>
    );
  };

  const displayItem = detailData || (contentItem.source_data
    ? (typeof contentItem.source_data === 'string'
      ? JSON.parse(contentItem.source_data)
      : contentItem.source_data)
    : contentItem) as MovieDetail | TVShowDetail | TVSeasonDetail | AlbumDetail | GameDetail | BookDetail;

  const handleSubmitRating = async (data: RatingCreate) => {
    setIsRatingLoading(true);
    try {
      if (userRating) {
        // Update existing rating - only send score and comment
        const updatedRating = await ratingActions.patch(userRating.id, {
          score: data.score,
          comment: data.comment,
        });
        setUserRating(updatedRating);
      } else {
        // Create new rating
        const newRating = await ratingActions.create({
          source_api: contentItem.source_api,
          external_id: contentItem.external_id,
          content_type: contentItem.content_type,
          score: data.score,
          comment: data.comment,
        });
        setUserRating(newRating);
      }

      // Refresh content item to get updated stats
      const updatedItem = await contentItemActions.get(contentItem.id);
      setContentItem(updatedItem);

      // Trigger ratings section refresh
      setRatingRefreshKey((prev) => prev + 1);
    } catch (err) {
      throw err;
    } finally {
      setIsRatingLoading(false);
    }
  };

  const handleDeleteRating = async () => {
    if (!userRating) return;

    setIsRatingLoading(true);
    try {
      await ratingActions.delete(userRating.id);
      setUserRating(null);

      // Refresh content item to get updated stats
      const updatedItem = await contentItemActions.get(contentItem.id);
      setContentItem(updatedItem);

      // Trigger ratings section refresh
      setRatingRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error("Error deleting rating:", err);
    } finally {
      setIsRatingLoading(false);
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-background-logged-in">
      <div className="pt-30 pb-20">
        {/* Banner Section */}
        <section className="-mt-30 mb-6 md:mb-10 relative z-0">
          <ContentBanner
            item={displayItem}
            tvShowTitle={contentItem?.content_type === ContentType.SEASON
              ? tvShowTitle || undefined
              : undefined
            }
            externalId={contentItem?.external_id}
            sourceApi={contentItem?.source_api}
            onAddToList={() => setIsAddToListModalOpen(true)}
            onRateContent={() => setIsRatingModalOpen(true)}
            isAuthenticated={!!user}
            hasUserRating={!!userRating}
          />
        </section>

        {/* Rating Summary */}
        {contentItem && (
          <section className="mb-10">
            <div className="container mx-auto px-4 mt-8">
              {contentItem.average_rating && (contentItem.rating_count ?? 0) > 0 ? (
                <div className="flex gap-2 flex-wrap flex-col">
                  <div className="flex items-center gap-2">
                    <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                    <span className="text-3xl font-bold text-white">
                      {(() => {
                        const num = parseFloat(contentItem.average_rating);
                        return Number.isInteger(num) ? num.toString() : num.toFixed(1);
                      })()}/10
                    </span>
                  </div>
                  <div className="text-white/80 font-sans text-md">
                    <span className="font-semibold">{contentItem.rating_count}</span>{" "}
                    {contentItem.rating_count === 1 ? "rating" : "ratings"}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        )}

        {/* About Section */}
        {renderAboutSection()}

        {/* Unified Ratings Section - right after About/description */}
        {/* Note: SEASON content type has ratings inside SeasonDetailContent (above episodes) */}
        {contentItem && contentItem.content_type !== ContentType.SEASON && (
          <RatingsSection
            key={ratingRefreshKey}
            contentItem={contentItem}
            userRating={userRating}
            onEditRating={() => setIsRatingModalOpen(true)}
            onDeleteRating={handleDeleteRating}
            isRatingLoading={isRatingLoading}
            user={user}
          />
        )}

        {/* Tracks Section (for albums only - after ratings) */}
        {renderTracksSection()}

        {/* Seasons Section (for TV shows - after ratings) */}
        {renderSeasonsSection()}

        {/* Gallery Section (for movies, TV shows, games - at the end) */}
        {renderGallerySection()}

        {/* API Attribution */}
        {contentItem && (
          <div className="container mx-auto px-4 mt-8 font-sans">
            <div className="text-center text-sm text-white/40">
              {contentItem.source_api === SourceApi.TMDB && (
                <div className="flex flex-row justify-center gap-2">
                  <p>
                    Data provided by{" "}
                    <a
                      href="https://www.themoviedb.org"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white/60 underline"
                    >
                      TMDB
                    </a>
                  </p>
                  <p>•</p>
                  <p>
                    <a
                      href="https://www.justwatch.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white/60 underline"
                    >
                      JustWatch
                    </a>
                  </p>
                </div>
              )}
              {contentItem.source_api === SourceApi.IGDB && (
                <p>
                  Data provided by{" "}
                  <a
                    href="https://www.igdb.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white/60 underline"
                  >
                    IGDB
                  </a>
                </p>
              )}
              {contentItem.source_api === SourceApi.SPOTIFY && (
                <p>
                  Data provided by{" "}
                  <a
                    href="https://www.spotify.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white/60 underline"
                  >
                    Spotify
                  </a>
                </p>
              )}
              {contentItem.source_api === SourceApi.OPENLIBRARY && (
                <p>
                  Data provided by{" "}
                  <a
                    href="https://openlibrary.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white/60 underline"
                  >
                    Open Library
                  </a>
                </p>
              )}
            </div>
          </div>
        )}

        <Footer />
      </div>

      {/* Rating Modal */}
      {user && (
        <RatingModal
          isOpen={isRatingModalOpen}
          onOpenChange={setIsRatingModalOpen}
          onSubmitRating={handleSubmitRating}
          existingRating={userRating}
          isLoading={isRatingLoading}
        />
      )}

      {/* Add to List Modal */}
      {user && contentItem && (
        <AddToListModal
          isOpen={isAddToListModalOpen}
          onOpenChange={setIsAddToListModalOpen}
          contentItem={{
            source_api: contentItem.source_api,
            external_id: contentItem.external_id,
            content_type: contentItem.content_type,
          }}
          tvShowSeasons={
            contentItem.content_type === ContentType.TV_SHOW &&
            detailData &&
            "seasons" in detailData &&
            Array.isArray(detailData.seasons) &&
            detailData.seasons.length > 0
              ? detailData.seasons
              : undefined
          }
          tvShowId={
            contentItem.content_type === ContentType.TV_SHOW &&
            detailData &&
            "seasons" in detailData &&
            Array.isArray(detailData.seasons) &&
            detailData.seasons.length > 0
              ? parseInt(contentItem.external_id)
              : undefined
          }
          onSuccess={() => {
            console.log("Successfully added to list");
          }}
        />
      )}

      {/* Bottom gradient */}
      <div className="pointer-events-none fixed left-0 right-0 bottom-0 h-16 bg-bottom-gradient z-10" />
    </div>
  );
}

