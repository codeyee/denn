
import { useMemo, useState } from "react";
import { TVSeasonDetail, ContentItem, Rating } from "@/lib/types";
import { normalizeContentPlatforms } from "@/lib/platforms/contentPlatforms";
import { EpisodeCard } from "@/components/common/cards/EpisodeCard";
import {
  ImageLightbox,
  type ImageGalleryItem,
} from "@/components/common/media/ImageLightbox";
import { formatReleaseDate } from "@/lib/utils/dateUtils";
import { cn } from "@/lib/utils/tailwindUtils";
import { PlatformsDisplay } from "../platforms/PlatformsDisplay";
import { RatingsSection } from "../components/RatingsSection";

interface SeasonDetailContentProps {
  season: TVSeasonDetail;
  contentItem?: ContentItem;
  userRating?: Rating | null;
  onEditRating?: () => void;
  onDeleteRating?: () => void;
  isRatingLoading?: boolean;
  user?: { id: number } | null;
}

export function SeasonDetailContent({
  season,
  contentItem,
  userRating,
  onEditRating,
  onDeleteRating,
  isRatingLoading,
  user,
}: SeasonDetailContentProps) {
  const [activeEpisodeIndex, setActiveEpisodeIndex] = useState<number | null>(null);
  const episodes = useMemo(() => season.episodes ?? [], [season.episodes]);
  const releaseDate = formatReleaseDate(season.release_date);

  const normalizedPlatforms = normalizeContentPlatforms(season.platforms);
  const hasPlatforms = normalizedPlatforms.length > 0;
  const episodeGalleryItems = useMemo<ImageGalleryItem[]>(
    () =>
      episodes.flatMap((episode) => {
        if (!episode.image_url) return [];

        const episodeDate = formatReleaseDate(episode.release_date);
        const duration = episode.duration_minutes
          ? `${episode.duration_minutes} min`
          : "";

        return [{
          id: episode.id,
          src: episode.image_url,
          alt: `${episode.title || `Episode ${episode.episode_number}`} still`,
          title: episode.title || `Episode ${episode.episode_number}`,
          metadata: [
            `Season ${episode.season_number}`,
            `Episode ${episode.episode_number}`,
            episodeDate,
            duration,
          ].filter(Boolean).join(" · "),
          description: episode.description,
        }];
      }),
    [episodes],
  );
  const episodeGalleryIndex = useMemo(
    () => new Map(episodeGalleryItems.map((item, index) => [item.id, index])),
    [episodeGalleryItems],
  );

  return (
    <>
      <div className="layout-content mt-8">
        <h2 className="text-2xl font-bold text-white mb-6">About</h2>

        {/* About layout */}
        <div className={cn("grid grid-cols-1 gap-8", hasPlatforms && "lg:grid-cols-3")}>
          {/* Left column - Description */}
          <div className={cn(hasPlatforms && "lg:col-span-2")}>
            {season.description && (
              <p className="text-gray-300 mb-6 leading-relaxed font-sans">
                {season.description}
              </p>
            )}

            <div className="space-y-2">
              {releaseDate && (
                <div>
                  <span className="text-white/60 font-bold">Release Date:</span>
                  <span className="text-white ml-2 font-sans">
                    {releaseDate}
                  </span>
                </div>
              )}
              {season.number_of_episodes !== undefined && (
                <div>
                  <span className="text-white/60 font-bold">Episodes:</span>
                  <span className="text-white ml-2 font-sans">
                    {season.number_of_episodes}
                  </span>
                </div>
              )}
            </div>
          </div>

          {hasPlatforms && (
            <div className="lg:col-span-1">
              <PlatformsDisplay platforms={normalizedPlatforms} />
            </div>
          )}
        </div>
      </div>

      {/* Ratings Section - above episodes */}
      {contentItem && (
        <RatingsSection
          contentItem={contentItem}
          userRating={userRating}
          onEditRating={onEditRating}
          onDeleteRating={onDeleteRating}
          isRatingLoading={isRatingLoading}
          user={user}
        />
      )}

      {/* Episodes Section */}
      {episodes.length > 0 && (
        <div className="layout-content mt-8">
          <h2 className="text-2xl font-bold text-white mb-6">Episodes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {episodes.map((episode) => (
              <EpisodeCard
                key={episode.id}
                episode={episode}
                onOpenGallery={
                  episodeGalleryIndex.has(episode.id)
                    ? () => setActiveEpisodeIndex(episodeGalleryIndex.get(episode.id) ?? null)
                    : undefined
                }
              />
            ))}
          </div>

          <ImageLightbox
            items={episodeGalleryItems}
            activeIndex={activeEpisodeIndex}
            isOpen={activeEpisodeIndex !== null}
            onOpenChange={(open) => {
              if (!open) setActiveEpisodeIndex(null);
            }}
            onIndexChange={setActiveEpisodeIndex}
          />
        </div>
      )}
    </>
  );
}
