import ContentCard from "../../../cards/ContentCard";
import Carousel from "../../../common/Carousel";
import type {
  MovieDetail,
  TVShowDetail,
  GameDetail,
  AlbumDetail,
  BookDetail,
} from "@/lib/api/types";

type ContentItem =
  | MovieDetail
  | TVShowDetail
  | GameDetail
  | AlbumDetail
  | BookDetail;

interface SearchResultsSectionProps {
  title: string;
  items: ContentItem[];
  itemsPerView?: number;
  targetCardWidth?: number;
}

const DEFAULT_TARGET_WIDTH = 250;

/**
 * Reusable search results carousel section
 * Displays a titled carousel of content cards
 */
export function SearchResultsSection({
  title,
  items,
  itemsPerView,
  targetCardWidth = DEFAULT_TARGET_WIDTH,
}: SearchResultsSectionProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mb-4 md:mb-8">
      <Carousel
        title={title}
        itemsPerView={itemsPerView}
        targetCardWidth={targetCardWidth}
      >
        {items.map((item) => (
          <ContentCard key={`${item.type}-${item.id}`} item={item} />
        ))}
      </Carousel>
    </section>
  );
}
