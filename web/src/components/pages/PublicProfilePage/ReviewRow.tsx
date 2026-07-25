import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Eye, Heart } from "lucide-react";

import { ResponsiveMedia } from "@/components/common/media/ResponsiveMedia";
import { RatingBadge } from "@/components/common/ui/RatingBadge";
import { StarRating } from "@/components/common/ui/StarRating";
import type { PublicRatingItem } from "@/lib/types";
import { formatProfileDate } from "./utils";

interface ReviewRowProps {
  rating: PublicRatingItem;
}

export function ReviewRow({ rating }: ReviewRowProps) {
  const [revealed, setRevealed] = useState(!rating.spoiler);
  const reviewId = `review-${rating.id}`;
  const score = Number(rating.score);

  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
      <div className="flex gap-4">
        <Link
          to="/content/$id"
          params={{ id: String(rating.content.id) }}
          preload="intent"
          aria-label={`Open ${rating.content.title}`}
          className="h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-white/5 outline-none focus-visible:ring-4 focus-visible:ring-white/70"
        >
          {rating.content.poster ? (
            <ResponsiveMedia
              src={rating.content.poster}
              alt=""
              width={160}
              height={240}
              sizes="64px"
              className="h-full w-full object-cover"
            />
          ) : null}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-white">
                <Link
                  to="/content/$id"
                  params={{ id: String(rating.content.id) }}
                  preload="intent"
                  className="rounded-sm hover:underline focus-visible:ring-4 focus-visible:ring-white/70"
                >
                  {rating.content.title}
                </Link>
              </h3>
              <p className="mt-1 text-xs text-white/50">
                {formatProfileDate(rating.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {rating.is_favorite ? (
                <Heart
                  aria-label="Favorite"
                  className="h-4 w-4 fill-fuchsia-300 text-fuchsia-300"
                />
              ) : null}
              <RatingBadge rating={score} variant="user" />
            </div>
          </div>
          <div
            role="img"
            className="mt-2"
            aria-label={`${score} out of 10`}
          >
            <StarRating value={score / 2} readonly size={16} />
          </div>
          {rating.review ? (
            rating.spoiler && !revealed ? (
              <button
                type="button"
                aria-controls={reviewId}
                aria-expanded="false"
                onClick={() => setRevealed(true)}
                className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/15 bg-black/25 px-3 text-sm text-white/80 outline-none hover:bg-white/10 focus-visible:ring-4 focus-visible:ring-white/70"
              >
                <Eye aria-hidden="true" className="h-4 w-4" />
                Reveal spoiler review
              </button>
            ) : (
              <p id={reviewId} className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/75">
                {rating.review}
              </p>
            )
          ) : (
            <p className="mt-3 text-sm italic text-white/50">Rating only</p>
          )}
        </div>
      </div>
    </article>
  );
}
