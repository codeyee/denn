import {
  TVShowDetail,
  TVSeason,
  ContentItem,
  ContentType,
  SourceApi,
  MovieDetail,
  TVSeasonDetail,
  AlbumDetail,
  GameDetail,
  BookDetail
} from "@/lib/api/types";
import { Carousel } from "@/app/_components/common/ui/Carousel";
import { ContentCard } from "@/app/_components/common/cards/ContentCard";
import { Content } from "@/types";

type DetailData = MovieDetail | TVShowDetail | TVSeasonDetail | AlbumDetail | GameDetail | BookDetail | null;

interface SeasonsSectionProps {
  detailData: DetailData;
  contentItem: ContentItem;
}

function isTVShowDetail(data: DetailData): data is TVShowDetail {
  return data !== null && 'type' in data && data.type === 'TV_SHOW';
}

export function SeasonsSection({ detailData, contentItem }: SeasonsSectionProps) {
  if (contentItem.content_type !== ContentType.TV_SHOW || !isTVShowDetail(detailData)) return null;

  if (!detailData.seasons || detailData.seasons.length === 0) return null;

  return (
    <div className="mt-8">
      <Carousel
        title="Seasons"
        itemsPerView={undefined}
        targetCardWidth={250}
      >
        {detailData.seasons.map((season) => {
          const seasonItem = createSeasonItem(season, detailData);
          return (
            <ContentCard
              key={season.id}
              item={{
                ...seasonItem,
                release_date: seasonItem.release_date === null ? undefined : seasonItem.release_date,
              } as unknown as Content}
            />
          );
        })}
      </Carousel>
    </div>
  );
}

function createSeasonItem(season: TVSeason, tvShow: TVShowDetail) {
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
}
