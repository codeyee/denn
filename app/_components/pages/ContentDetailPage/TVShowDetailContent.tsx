"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TVShowDetail, TVSeason } from "@/lib/api/types";
import { videoActions } from "@/lib/api";
import { ChevronRight } from "lucide-react";

interface TVShowDetailContentProps {
  tvShow: TVShowDetail;
}

export default function TVShowDetailContent({ tvShow }: TVShowDetailContentProps) {
  const router = useRouter();
  const [expandedSeasons, setExpandedSeasons] = useState<Set<number>>(new Set());
  const [seasonDetails, setSeasonDetails] = useState<Record<number, any>>({});
  const [loadingSeasons, setLoadingSeasons] = useState<Set<number>>(new Set());

  const toggleSeason = async (season: TVSeason) => {
    const seasonNumber = season.season_number;
    
    if (expandedSeasons.has(seasonNumber)) {
      // Collapse
      const newExpanded = new Set(expandedSeasons);
      newExpanded.delete(seasonNumber);
      setExpandedSeasons(newExpanded);
    } else {
      // Expand - fetch season details
      setExpandedSeasons(new Set([...expandedSeasons, seasonNumber]));
      
      // Check if we already have the season details
      if (!seasonDetails[seasonNumber]) {
        setLoadingSeasons(new Set([...loadingSeasons, seasonNumber]));
        try {
          const detail = await videoActions.getTVSeason(tvShow.id, seasonNumber);
          setSeasonDetails({ ...seasonDetails, [seasonNumber]: detail });
        } catch (error) {
          console.error("Error loading season details:", error);
        } finally {
          const newLoading = new Set(loadingSeasons);
          newLoading.delete(seasonNumber);
          setLoadingSeasons(newLoading);
        }
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white/5 rounded-2xl p-6 md:p-8 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">About</h2>
            {tvShow.tagline && (
              <p className="text-white/80 italic mb-4">"{tvShow.tagline}"</p>
            )}
            {tvShow.description && (
              <p className="text-gray-300 mb-4 leading-relaxed">{tvShow.description}</p>
            )}
            
            <div className="mt-6 space-y-2">
              {tvShow.release_date && (
                <div>
                  <span className="text-white/60 text-sm">Release Date:</span>
                  <span className="text-white ml-2">{tvShow.release_date}</span>
                </div>
              )}
              {tvShow.status && (
                <div>
                  <span className="text-white/60 text-sm">Status:</span>
                  <span className="text-white ml-2">{tvShow.status}</span>
                </div>
              )}
              {tvShow.number_of_seasons !== undefined && (
                <div>
                  <span className="text-white/60 text-sm">Seasons:</span>
                  <span className="text-white ml-2">{tvShow.number_of_seasons}</span>
                </div>
              )}
              {tvShow.number_of_episodes !== undefined && (
                <div>
                  <span className="text-white/60 text-sm">Episodes:</span>
                  <span className="text-white ml-2">{tvShow.number_of_episodes}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Seasons Section */}
      {tvShow.seasons && tvShow.seasons.length > 0 && (
        <div className="bg-white/5 rounded-2xl p-6 md:p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Seasons</h2>
          <div className="space-y-4">
            {tvShow.seasons.map((season) => {
              const isExpanded = expandedSeasons.has(season.season_number);
              const isLoading = loadingSeasons.has(season.season_number);
              const seasonDetail = seasonDetails[season.season_number];

              return (
                <div
                  key={season.id}
                  className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors"
                >
                  <button
                    onClick={() => toggleSeason(season)}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {season.title || `Season ${season.season_number}`}
                      </h3>
                      <div className="flex gap-4 text-sm text-gray-400">
                        {season.release_date && (
                          <span>{season.release_date}</span>
                        )}
                        {season.number_of_episodes !== undefined && (
                          <span>{season.number_of_episodes} episodes</span>
                        )}
                      </div>
                      {season.description && (
                        <p className="text-gray-300 mt-2 line-clamp-2">{season.description}</p>
                      )}
                    </div>
                    <ChevronRight
                      className={`w-5 h-5 text-white/60 transition-transform ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      {isLoading ? (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto"></div>
                          <p className="text-gray-400 mt-2 text-sm">Loading episodes...</p>
                        </div>
                      ) : seasonDetail?.episodes ? (
                        <div className="space-y-3">
                          <h4 className="text-white font-semibold mb-3">Episodes</h4>
                          {seasonDetail.episodes.map((episode) => (
                            <div
                              key={episode.id}
                              className="bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors"
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-8 text-center">
                                  <span className="text-white/60 text-sm font-medium">
                                    {episode.episode_number}
                                  </span>
                                </div>
                                <div className="flex-1">
                                  <h5 className="text-white font-medium mb-1">
                                    {episode.title || `Episode ${episode.episode_number}`}
                                  </h5>
                                  {episode.description && (
                                    <p className="text-gray-400 text-sm line-clamp-2">
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
                      ) : (
                        <p className="text-gray-400 text-sm">No episodes available</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

