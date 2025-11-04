"use client";

import { TVSeasonDetail, TVEpisode } from "@/lib/api/types";

interface SeasonDetailContentProps {
  season: TVSeasonDetail;
  tvShowTitle?: string;
}

export default function SeasonDetailContent({ season, tvShowTitle }: SeasonDetailContentProps) {
  return (
    <>
      <div className="bg-white/5 rounded-2xl p-6 md:p-8 mb-6">
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
        <div className="bg-white/5 rounded-2xl p-6 md:p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Episodes</h2>
          <div className="space-y-3">
            {season.episodes.map((episode) => (
              <div
                key={episode.id}
                className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-8 text-center">
                    <span className="text-white/60 text-sm font-medium">
                      {episode.episode_number}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-medium mb-1">
                      {episode.title || `Episode ${episode.episode_number}`}
                    </h3>
                    {episode.description && (
                      <p className="text-gray-400 text-sm mt-2 line-clamp-2">
                        {episode.description}
                      </p>
                    )}
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      {episode.release_date && (
                        <span>{episode.release_date}</span>
                      )}
                      {episode.duration_minutes && (
                        <span>{episode.duration_minutes} min</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
