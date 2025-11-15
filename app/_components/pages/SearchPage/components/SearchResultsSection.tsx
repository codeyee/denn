import { ContentCard } from "../../../cards/ContentCard";
import { Carousel } from "../../../common/ui/Carousel";
import type { MovieDetail, TVShowDetail, GameDetail, AlbumDetail, BookDetail } from "@/lib/api/types";

type ContentItem =
  | MovieDetail
  | TVShowDetail
  | GameDetail
  | AlbumDetail
  | BookDetail;

interface SearchResultsSectionProps {
  title: string;
  items: ContentItem[];
}

export function SearchResultsSection({ title, items }: SearchResultsSectionProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mb-4 md:mb-8">
      <Carousel title={title}>
        {items.map((item) => (
          <ContentCard key={`${item.type}-${item.id}`} item={item} />
        ))}
      </Carousel>
    </section>
  );
}
