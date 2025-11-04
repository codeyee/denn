"use client";

import { TVSeasonDetail, TVEpisode } from "@/lib/api/types";
import EpisodeCard from "@/app/_components/cards/EpisodeCard";

interface SeasonDetailContentProps {
  season: TVSeasonDetail;
  tvShowTitle?: string;
}

export default function SeasonDetailContent({ season, tvShowTitle }: SeasonDetailContentProps) {
  return (
    <>
      <div className="p-6 md:p-8 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">About</h2>
            {season.description && (
              <p className="text-gray-300 mb-4 leading-relaxed">{season.description}</p>
            )}

            <div className="mt-6 space-y-2">
              {season.release_date && (
                <div>
                  <span className="text-white/60 text-sm">Release Date:</span>
                  <span className="text-white ml-2">{season.release_date}</span>
                </div>
              )}
              {season.number_of_episodes !== undefined && (
                <div>
                  <span className="text-white/60 text-sm">Episodes:</span>
                  <span className="text-white ml-2">{season.number_of_episodes}</span>
                </div>
              )}
              {season.season_number !== undefined && (
                <div>
                  <span className="text-white/60 text-sm">Season Number:</span>
                  <span className="text-white ml-2">{season.season_number}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Episodes Section */}
      {season.episodes && season.episodes.length > 0 && (
        <div className="p-6 md:p-8">
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
