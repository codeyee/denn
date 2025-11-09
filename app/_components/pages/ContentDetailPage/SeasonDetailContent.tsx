"use client";

import { TVSeasonDetail, TVEpisode } from "@/lib/api/types";
import EpisodeCard from "@/app/_components/cards/EpisodeCard";
import { formatReleaseDate } from "@/lib/utils/dateUtils";

interface SeasonDetailContentProps {
  season: TVSeasonDetail;
  tvShowTitle?: string;
}

export default function SeasonDetailContent({ season, tvShowTitle }: SeasonDetailContentProps) {
  const releaseDate = formatReleaseDate(season.release_date);

  return (
    <>
      <div className="container mx-auto px-4">
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-white mb-6">About</h2>
          {season.description && (
            <p className="text-gray-300 mb-4 leading-relaxed font-sans">{season.description}</p>
          )}

          <div className="mt-6 space-y-2">
              {releaseDate && (
                <div>
                  <span className="text-white/60 font-bold">Release Date:</span>
                  <span className="text-white ml-2 font-sans">{releaseDate}</span>
                </div>
              )}
              {season.number_of_episodes !== undefined && (
                <div>
                  <span className="text-white/60 font-bold">Episodes:</span>
                  <span className="text-white ml-2 font-sans">{season.number_of_episodes}</span>
                </div>
              )}
            </div>
          </div>
        </div>

      {/* Episodes Section */}
      {season.episodes && season.episodes.length > 0 && (
        <div className="container mx-auto px-4 mb-10">
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
