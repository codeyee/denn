import { Star } from "lucide-react";
import { ContentBanner } from "../ContentBanner";
import {
  MovieDetail,
  TVShowDetail,
  TVSeasonDetail,
  AlbumDetail,
  GameDetail,
  BookDetail,
  ContentItem,
  ContentType,
  Rating
} from "@/lib/api/types";

interface ContentHeaderProps {
  displayItem: MovieDetail | TVShowDetail | TVSeasonDetail | AlbumDetail | GameDetail | BookDetail;
  contentItem: ContentItem;
  tvShowTitle?: string;
  userRating: Rating | null;
  isAuthenticated: boolean;
  onAddToList: () => void;
  onRateContent: () => void;
}

export function ContentHeader({
  displayItem,
  contentItem,
  tvShowTitle,
  userRating,
  isAuthenticated,
  onAddToList,
  onRateContent
}: ContentHeaderProps) {
  return (
    <>
      <section className="-mt-30 mb-6 md:mb-10 relative z-0">
        <ContentBanner
          item={displayItem}
          tvShowTitle={contentItem.content_type === ContentType.SEASON ? tvShowTitle : undefined}
          externalId={contentItem.external_id}
          sourceApi={contentItem.source_api}
          onAddToList={onAddToList}
          onRateContent={onRateContent}
          isAuthenticated={isAuthenticated}
          hasUserRating={!!userRating}
        />
      </section>

      <section className="mb-10">
        <div className="container mx-auto px-4 mt-8">
          {contentItem.average_rating && (contentItem.rating_count ?? 0) > 0 ? (
            <div className="flex gap-2 flex-wrap flex-col">
              <div className="flex items-center gap-2">
                <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                <span className="text-3xl font-bold text-white">
                  {(() => {
                    const num = parseFloat(contentItem.average_rating);
                    return Number.isInteger(num) ? num.toString() : num.toFixed(1);
                  })()}/10
                </span>
              </div>
              <div className="text-white/80 font-sans text-md">
                <span className="font-semibold">{contentItem.rating_count}</span>{" "}
                {contentItem.rating_count === 1 ? "rating" : "ratings"}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
