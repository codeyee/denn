"use client";

import { TVSeasonDetail, ContentItem, Rating } from "@/lib/types";
import { EpisodeCard } from "@/app/_components/common/cards/EpisodeCard";
import { formatReleaseDate } from "@/lib/utils/dateUtils";
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
  const releaseDate = formatReleaseDate(season.release_date);

  const platformsByAction = season.platforms || {};

  return (
    <>
      <div className="container mx-auto px-4 mt-8">
        <h2 className="text-2xl font-bold text-white mb-6">About</h2>

        {/* 2-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - Description */}
          <div className="lg:col-span-2">
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

          {/* Right column - Where to Watch */}
          <div className="lg:col-span-1">
            <PlatformsDisplay platforms={platformsByAction} />
          </div>
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
      {season.episodes && season.episodes.length > 0 && (
        <div className="container mx-auto px-4 mt-8">
          <h2 className="text-2xl font-bold text-white mb-6">Episodes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {season.episodes.map((episode) => (
              <EpisodeCard key={episode.id} episode={episode} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
