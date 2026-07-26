import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";

import { MediaListItem } from "@/components/common/lists/MediaListItem";
import { RatingBadge } from "@/components/common/ui/RatingBadge";
import { StarRating } from "@/components/common/ui/StarRating";
import {
  getContentTypeIcon,
  getContentTypeLabel,
} from "@/lib/icons/contentTypeIcons";
import type { PublicRatingItem } from "@/lib/types";
import { formatProfileDate } from "./utils";

interface ReviewRowProps {
  rating: PublicRatingItem;
}

export function ReviewRow({ rating }: ReviewRowProps) {
  const score = Number(rating.score);
  const ContentIcon = getContentTypeIcon(rating.content.type);
  const contentTypeLabel = getContentTypeLabel(rating.content.type);
  const artwork = rating.content.backdrop ?? rating.content.poster;

  return (
    <article>
      <Link
        to="/content/$id"
        params={{ id: String(rating.content.id) }}
        preload="intent"
        aria-label={`Open ${rating.content.title}`}
        className="block rounded-lg outline-none focus-visible:ring-4 focus-visible:ring-white/80"
      >
        <MediaListItem
          title={rating.content.title}
          titleIcon={
            <ContentIcon
              aria-label={contentTypeLabel}
              className="h-4 w-4 md:h-5 md:w-5"
            />
          }
          description={formatProfileDate(rating.created_at)}
          image={artwork}
          imageAlt={`${rating.content.title} artwork`}
          mediaFallback={<ContentIcon aria-hidden="true" className="h-10 w-10" />}
          variant="review"
          className="h-64 md:h-56"
          trailingContent={
            <div className="flex items-center gap-2">
              {rating.is_favorite ? (
                <Heart
                  aria-label="Favorite"
                  className="h-4 w-4 fill-rose-400 text-rose-400"
                />
              ) : null}
              <RatingBadge rating={score} variant="user" />
            </div>
          }
        >
          <div
            role="img"
            className="mt-2"
            aria-label={`${score} out of 10`}
          >
            <StarRating value={score / 2} readonly size={16} />
          </div>
          {rating.review ? (
            <ClampedReviewText review={rating.review} />
          ) : (
            <p className="mt-3 text-sm italic text-white/55">Rating only</p>
          )}
        </MediaListItem>
      </Link>
    </article>
  );
}

function ClampedReviewText({ review }: { review: string }) {
  const paragraphRef = useRef<HTMLParagraphElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const paragraph = paragraphRef.current;
    if (!paragraph) return;

    const updateTruncation = () => {
      setIsTruncated(paragraph.scrollHeight > paragraph.clientHeight + 1);
    };
    updateTruncation();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateTruncation);
    observer.observe(paragraph);
    return () => observer.disconnect();
  }, [review]);

  return (
    <div className="mt-3">
      <p
        ref={paragraphRef}
        className="line-clamp-3 max-w-[75ch] whitespace-pre-wrap text-sm leading-6 text-white/80"
      >
        {review}
      </p>
      {isTruncated ? (
        <span className="mt-1.5 inline-flex text-sm font-semibold text-white underline decoration-white/40 underline-offset-4">
          View more
        </span>
      ) : null}
    </div>
  );
}
