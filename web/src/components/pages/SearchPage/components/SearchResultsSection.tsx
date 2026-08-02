import { ContentCard } from "../../../common/cards/ContentCard";
import { Carousel } from "../../../common/ui/Carousel";
import { BrowseSectionLink } from "../../../common/ui/BrowseSectionLink";
import { SectionTitle } from "../../../common/ui/SectionTitle";
import {
  CONTENT_TYPE_DEFINITIONS,
  type DiscoveryContentType,
} from "@/lib/contentTypes";
import { ContentType, type BrowseType } from "@/lib/types";
import type {
  AlbumDetail,
  BookDetail,
  GameDetail,
  MovieDetail,
  TVShowDetail,
} from "@/lib/types";

type ContentItem =
  | MovieDetail
  | TVShowDetail
  | GameDetail
  | AlbumDetail
  | BookDetail;

const BROWSE_TYPE_BY_CONTENT_TYPE = {
  [ContentType.MOVIE]: "movies",
  [ContentType.TV_SHOW]: "tv-shows",
  [ContentType.GAME]: "games",
  [ContentType.ALBUM]: "music",
  [ContentType.BOOK]: "books",
} satisfies Record<DiscoveryContentType, BrowseType>;

interface SearchResultsSectionProps {
  contentType: DiscoveryContentType;
  items: ContentItem[];
  query: string;
}

export function SearchResultsSection({
  contentType,
  items,
  query,
}: SearchResultsSectionProps) {
  const definition = CONTENT_TYPE_DEFINITIONS[contentType];
  const title = definition.pluralLabel;

  if (items.length > 0) {
    return (
      <Carousel
        title={title}
        titleIcon={definition.icon}
        titleAction={
          <BrowseSectionLink
            type={BROWSE_TYPE_BY_CONTENT_TYPE[contentType]}
            label={definition.pluralLabel}
            query={query}
          />
        }
        className="mb-4 md:mb-8"
      >
        {items.map((item) => (
          <ContentCard key={`${item.type}-${item.id}`} item={item} />
        ))}
      </Carousel>
    );
  }

  return (
    <section className="mb-4 md:mb-8">
      <div className="px-4 md:px-8">
        <SectionTitle
          title={title}
          icon={definition.icon}
          className="mb-4"
          action={
            <BrowseSectionLink
              type={BROWSE_TYPE_BY_CONTENT_TYPE[contentType]}
              label={definition.pluralLabel}
              query={query}
            />
          }
        />
        <div className="flex items-center justify-center py-8 px-4 rounded-lg border border-white/10 bg-white/5">
          <p className="text-white/60 text-sm">
            No {title.toLowerCase()} found
          </p>
        </div>
      </div>
    </section>
  );
}
