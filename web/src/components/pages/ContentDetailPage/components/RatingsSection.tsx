
import { useMemo, useState } from "react";
import { Button } from "@/components/common/ui/Button";
import { useRatingsListQuery, RATINGS_PAGE_SIZE } from "@/lib/api/queries";
import type { ContentItem, Rating } from "@/lib/types";
import { Pencil, Star, Trash2 } from "lucide-react";

interface RatingsSectionProps {
  contentItem: ContentItem;
  userRating?: Rating | null;
  onEditRating?: () => void;
  onDeleteRating?: () => void;
  isRatingLoading?: boolean;
  user?: { id: number } | null;
}

export function RatingsSection({
  contentItem,
  userRating,
  onEditRating,
  onDeleteRating,
  isRatingLoading,
  user,
}: RatingsSectionProps) {
  const [page, setPage] = useState(1);
  const ratingsQuery = useRatingsListQuery(contentItem.id, page, {
    pageSize: RATINGS_PAGE_SIZE,
  });

  const metadata = ratingsQuery.data?.metadata;
  const error =
    ratingsQuery.error instanceof Error ? ratingsQuery.error.message : null;

  const allRatings = useMemo(() => {
    const ratings = ratingsQuery.data?.results ?? [];
    const others = userRating
      ? ratings.filter((rating) => rating.id !== userRating.id)
      : ratings;
    return userRating ? [userRating, ...others] : others;
  }, [ratingsQuery.data?.results, userRating]);

  if (ratingsQuery.isLoading && page === 1) {
    return (
      <div className="mt-8 w-full px-4 md:px-8 lg:px-12">
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4" />
            <p className="text-gray-400">Loading ratings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 w-full px-4 md:px-8 lg:px-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Ratings</h2>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-md p-3 mb-4">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}

      {allRatings.length > 0 ? (
        <div className="space-y-4">
          {allRatings.map((rating) => (
            <RatingCard
              key={rating.id}
              rating={rating}
              isUserRating={rating.id === userRating?.id}
              user={user}
              isRatingLoading={isRatingLoading}
              onEditRating={onEditRating}
              onDeleteRating={onDeleteRating}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white/5 rounded-lg p-6 text-center font-sans">
          <p className="text-white/60 mb-2">
            No ratings to display. Be the first to rate this content!
          </p>
        </div>
      )}

      {(metadata?.next || metadata?.previous) && (
        <div className="flex justify-center gap-4 mt-6">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!metadata.previous || ratingsQuery.isFetching}
          >
            Previous
          </Button>
          <span className="text-white/60 flex items-center">Page {page}</span>
          <Button
            variant="outline"
            onClick={() => setPage((p) => p + 1)}
            disabled={!metadata.next || ratingsQuery.isFetching}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function RatingCard({
  rating,
  isUserRating,
  user,
  isRatingLoading,
  onEditRating,
  onDeleteRating,
}: {
  rating: Rating;
  isUserRating: boolean;
  user?: { id: number } | null;
  isRatingLoading?: boolean;
  onEditRating?: () => void;
  onDeleteRating?: () => void;
}) {
  return (
    <div className="bg-white/5 rounded-lg px-4 py-5 border border-white/10 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-5">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-bold">
              {rating.user.username.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-white font-semibold">{rating.user.username}</p>
              {isUserRating && user && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={onEditRating}
                    disabled={isRatingLoading}
                    className="p-1 hover:bg-white/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    title="Edit rating"
                  >
                    <Pencil className="w-4 h-4 text-white/60 hover:text-white" />
                  </button>
                  <button
                    onClick={onDeleteRating}
                    disabled={isRatingLoading}
                    className="p-1 hover:bg-white/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    title="Delete rating"
                  >
                    <Trash2 className="w-4 h-4 text-white/60 hover:text-red-400" />
                  </button>
                </div>
              )}
            </div>
            <p className="text-white/60 text-sm mb-2">
              {formatDate(rating.created_at)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-lg">
          <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
          <span className="text-white/80 font-bold">
            {formatRating(rating.score)}/10
          </span>
        </div>

        {rating.comment && (
          <p className="text-white/80 font-sans">{rating.comment}</p>
        )}
      </div>
    </div>
  );
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatRating(score: number | string) {
  const num = typeof score === "string" ? parseFloat(score) : score;
  return Number.isInteger(num) ? num.toString() : num.toFixed(1);
}
