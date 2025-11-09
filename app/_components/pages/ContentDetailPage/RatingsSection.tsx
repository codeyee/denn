"use client";

import { useEffect, useState, useMemo } from "react";
import { ratingActions } from "@/lib/api";
import { Rating, PaginatedRatingList, ContentItem } from "@/lib/api/types";
import { Button } from "@/app/_components/lib/button";
import { Pencil, Trash2, Star } from "lucide-react";

interface RatingsSectionProps {
  contentItem: ContentItem;
  userRating?: Rating | null;
  onRatingChange?: () => void;
  onEditRating?: () => void;
  onDeleteRating?: () => void;
  isRatingLoading?: boolean;
  user?: { id: number } | null;
}

export default function RatingsSection({
  contentItem,
  userRating,
  onRatingChange,
  onEditRating,
  onDeleteRating,
  isRatingLoading,
  user,
}: RatingsSectionProps) {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const fetchRatings = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch ratings for this content item
        const response: PaginatedRatingList = await ratingActions.list({
          content_item_id: contentItem.id,
          page,
          page_size: 10,
        });

        setRatings(response.results);
        setHasNext(!!response.next);
        setHasPrevious(!!response.previous);
        setTotalCount(response.count);
      } catch (err) {
        console.error("Error fetching ratings:", err);
        setError(err instanceof Error ? err.message : "Failed to load ratings");
      } finally {
        setLoading(false);
      }
    };

    if (contentItem?.id) {
      fetchRatings();
    }
  }, [contentItem?.id, page]);

  // Filter out user rating from the list to avoid duplicates
  const filteredRatings = useMemo(() => {
    if (!userRating) return ratings;
    return ratings.filter((rating) => rating.id !== userRating.id);
  }, [ratings, userRating]);

  // Combine user rating (first) with other ratings
  const allRatings = useMemo(() => {
    const result = [];
    if (userRating) {
      result.push(userRating);
    }
    result.push(...filteredRatings);
    return result;
  }, [userRating, filteredRatings]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatRating = (score: number | string): string => {
    const num = typeof score === "string" ? parseFloat(score) : score;
    return Number.isInteger(num) ? num.toString() : num.toFixed(1);
  };

  const renderRatingCard = (rating: Rating, isUserRating: boolean = false) => {
    return (
      <div
        key={rating.id}
        className="bg-white/5 rounded-lg px-4 py-5 border border-white/10 flex flex-col gap-2"
      >
        <div className="flex items-start justify-between gap-5">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-bold">
                {rating.user.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-white font-semibold">
                  {rating.user.username}
                </p>
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
            <p className="text-white/80 font-sans">
              {rating.comment}
            </p>
          )}
        </div>
      </div>
    );
  };

  if (loading && page === 1) {
    return (
      <div className="container mx-auto px-4 mt-8">
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-gray-400">Loading ratings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 mt-8">
      <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Ratings</h2>
          {!userRating && user && onEditRating && (
            <Button
              onClick={onEditRating}
              disabled={isRatingLoading}
              variant="default"
              size="sm"
              className="cursor-pointer flex items-center gap-2"
            >
              <Star className="w-4 h-4" />
              Rate This
            </Button>
          )}
      </div>

      {/* Ratings List */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-md p-3 mb-4">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        {allRatings.length > 0 ? (
          <div className="space-y-4">
            {allRatings.map((rating) =>
              renderRatingCard(rating, rating.id === userRating?.id)
            )}
          </div>
        ) : !loading && (
          <div className="bg-white/5 rounded-lg p-6 text-center">
            <p className="text-white/60 mb-2">No ratings to display. Be the first to rate this content!</p>
          </div>
        )}

      {/* Pagination */}
      {(hasNext || hasPrevious) && (
        <div className="flex justify-center gap-4 mt-6">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!hasPrevious || loading}
          >
            Previous
          </Button>
          <span className="text-white/60 flex items-center">
            Page {page}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasNext || loading}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

