import { Link } from "@tanstack/react-router";
import { MessageSquareText, Star } from "lucide-react";
import { RatingBadge } from "@/components/common/ui/RatingBadge";

const PROFILE_RATING_BADGE_CLASS =
  "h-8 border-amber-300/70 bg-[#180d12]/95 px-2.5 py-0 text-amber-100";

export function ProfileCardIndicators({
  rating,
  review,
  isFavorite = false,
}: {
  rating?: number | null;
  review?: {
    contentId: number;
    title: string;
  } | null;
  isFavorite?: boolean;
}) {
  return (
    <div
      aria-label="Content indicators"
      className="flex items-center gap-2"
      role="group"
    >
      {rating !== null && rating !== undefined ? (
        <RatingBadge
          rating={rating}
          variant="user"
          className={PROFILE_RATING_BADGE_CLASS}
        />
      ) : null}
      {review ? (
        <ReviewIndicator
          contentId={review.contentId}
          title={review.title}
          interactive
        />
      ) : null}
      {isFavorite ? <FavoriteBadge /> : null}
    </div>
  );
}

export function FavoriteBadge() {
  return (
    <span className="pointer-events-none grid h-8 w-8 place-items-center rounded-full bg-[#180d12]/95 text-amber-200">
      <Star aria-label="Favorite" className="h-4 w-4 fill-current" />
    </span>
  );
}

export function ReviewIndicator({
  contentId,
  title,
  interactive = false,
}: {
  contentId: number;
  title: string;
  interactive?: boolean;
}) {
  const indicator = (
    <span className="grid h-8 w-8 place-items-center rounded-full bg-[#180d12]/95 text-fuchsia-100">
      <MessageSquareText
        aria-hidden={interactive}
        aria-label={interactive ? undefined : "Review available"}
        className="h-4 w-4"
      />
    </span>
  );

  if (!interactive) return indicator;
  return (
    <Link
      to="/content/$id"
      params={{ id: String(contentId) }}
      hash="ratings"
      preload="intent"
      aria-label={`Open review for ${title}`}
      className="pointer-events-auto rounded-full outline-none transition-transform duration-200 hover:scale-105 focus-visible:ring-4 focus-visible:ring-white/80 motion-reduce:transition-none"
    >
      {indicator}
    </Link>
  );
}
