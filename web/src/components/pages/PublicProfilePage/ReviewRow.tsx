import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";

import { MediaListItem } from "@/components/common/lists/MediaListItem";
import { RatingBadge } from "@/components/common/ui/RatingBadge";
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
  const artwork = rating.content.poster;

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
            rating.is_favorite ? (
              <Star
                aria-label="Favorite"
                className="h-4 w-4 fill-amber-200 text-amber-200"
              />
            ) : null
          }
        >
          <div className="mt-3">
            <RatingBadge
              rating={score}
              variant="user"
              className="border-amber-300/70 bg-[#180d12]/95 text-amber-100"
            />
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
    <div className="relative mt-3 max-w-[75ch]">
      <p
        ref={paragraphRef}
        className={`line-clamp-3 whitespace-normal text-sm leading-6 text-white/80 ${
          isTruncated ? "pr-24" : ""
        }`}
      >
        {review}
      </p>
      {isTruncated ? (
        <span className="absolute bottom-0 right-0 inline-flex bg-linear-to-r from-transparent via-[#180d12]/95 to-[#180d12]/95 pl-3 text-sm font-semibold leading-6 text-white underline decoration-white/40 underline-offset-4">
          View more
        </span>
      ) : null}
    </div>
  );
}
