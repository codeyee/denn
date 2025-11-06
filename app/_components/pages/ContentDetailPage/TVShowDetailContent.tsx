"use client";

import { TVShowDetail, TVSeason } from "@/lib/api/types";
import ContentCard from "@/app/_components/cards/ContentCard";
import Carousel from "@/app/_components/common/Carousel";
import { SourceApi, ContentType } from "@/lib/api/types";
import { formatReleaseDate } from "@/lib/utils/dateUtils";

interface TVShowDetailContentProps {
  tvShow: TVShowDetail;
}

export default function TVShowDetailContent({ tvShow }: TVShowDetailContentProps) {
  // Convert season to ContentItem-like object for ContentCard
  const createSeasonItem = (season: TVSeason) => {
    // Create external_id in format "tv_id:season_number"
    const externalId = `${tvShow.id}:${season.season_number}`;

    return {
      id: externalId, // Use external_id format as id for navigation
      title: season.title || `Season ${season.season_number}`,
      image_url: season.image_url,
      release_date: season.release_date,
      number_of_episodes: season.number_of_episodes,
      description: season.description,
      tv_show_name: tvShow.title,
      type: "season" as const,
      external_id: externalId,
      source_api: SourceApi.TMDB,
      content_type: ContentType.SEASON,
    };
  };

  const status = tvShow.status === "Returning Series" ? "Currently in emission" : "Ended";
  const releaseDate = formatReleaseDate(tvShow.release_date);

  return (
    <>
      <div className="container mx-auto px-4">
        <div className="mb-10 text-lg">
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">About</h2>
            {tvShow.tagline && (
              <p className="text-white/80 italic mb-4 font-sans">"{tvShow.tagline}"</p>
            )}
            {tvShow.description && (
              <p className="text-gray-300 mb-4 leading-relaxed font-sans">{tvShow.description}</p>
            )}

            <div className="my-6 space-y-2">
              {releaseDate && (
                <div>
                  <span className="text-white/60 font-bold">Release Date:</span>
                  <span className="text-white ml-2 font-sans">{releaseDate}</span>
                </div>
              )}
              {status && status !== "Ended" && (
                <div>
                  <span className="text-white/60 font-bold">Status:</span>
                  <span className="text-white ml-2 font-sans">{status}</span>
                </div>
              )}
              {tvShow.number_of_seasons !== undefined && (
                <div>
                  <span className="text-white/60 font-bold">Seasons:</span>
                  <span className="text-white ml-2 font-sans">{tvShow.number_of_seasons}</span>
                </div>
              )}
              {tvShow.number_of_episodes !== undefined && (
                <div>
                  <span className="text-white/60 font-bold">Episodes:</span>
                  <span className="text-white ml-2 font-sans">{tvShow.number_of_episodes}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Seasons Section */}
      {tvShow.seasons && tvShow.seasons.length > 0 && (
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
                }}
              />
            );
          })}
        </Carousel>
      )}
    </>
  );
}

