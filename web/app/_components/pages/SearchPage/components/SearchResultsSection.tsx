import { ContentCard } from "../../../common/cards/ContentCard";
import { Carousel } from "../../../common/ui/Carousel";
import type { MovieDetail, TVShowDetail, GameDetail, AlbumDetail, BookDetail } from "@/lib/types";

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
  return (
    <section className="mb-4 md:mb-8">
      {items.length > 0 ? (
        <Carousel title={title}>
          {items.map((item) => (
            <ContentCard key={`${item.type}-${item.id}`} item={item} />
          ))}
        </Carousel>
      ) : (
        <div className="px-4 md:px-8">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-4">{title}</h2>
          <div className="flex items-center justify-center py-8 px-4 rounded-lg border border-white/10 bg-white/5">
            <p className="text-white/60 text-sm">No {title.toLowerCase()} found</p>
          </div>
        </div>
      )}
    </section>
  );
}
