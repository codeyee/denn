import { ContentCard } from "../../../common/cards/ContentCard";
import { Carousel } from "../../../common/ui/Carousel";
import { SectionTitle } from "../../../common/ui/SectionTitle";
import { CONTENT_TYPE_DEFINITIONS } from "@/lib/contentTypes";
import type {
  AlbumDetail,
  BookDetail,
  ContentType,
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

interface SearchResultsSectionProps {
  contentType: ContentType;
  items: ContentItem[];
}

export function SearchResultsSection({
  contentType,
  items,
}: SearchResultsSectionProps) {
  const definition = CONTENT_TYPE_DEFINITIONS[contentType];
  const title = definition.pluralLabel;

  if (items.length > 0) {
    return (
      <Carousel
        title={title}
        titleIcon={definition.icon}
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
