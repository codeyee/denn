import { Link } from "@tanstack/react-router";

import { MediaListItem } from "@/components/common/lists/MediaListItem";
import { VerticalList } from "@/components/common/lists/VerticalList";
import { RatingBadge } from "@/components/common/ui/RatingBadge";
import {
  getContentTypeIcon,
  getContentTypeLabel,
} from "@/lib/icons/contentTypeIcons";
import type { PublicProgressItem } from "@/lib/types";
import {
  formatProfileDate,
  getProfileContentAttribution,
} from "./utils";
import { FavoriteBadge, ReviewIndicator } from "./ProfileIndicators";

const RATING_BADGE_CLASS =
  "border-amber-300/70 bg-[#180d12]/95 text-amber-100";

export function ProgressList({ items }: { items: PublicProgressItem[] }) {
  return (
    <VerticalList spacing="md">
      {items.map((item) => (
        <ProgressListRow key={item.id} item={item} />
      ))}
    </VerticalList>
  );
}

function ProgressListRow({ item }: { item: PublicProgressItem }) {
  const ContentIcon = getContentTypeIcon(item.content.type);
  const contentTypeLabel = getContentTypeLabel(item.content.type);
  const hasReview = Boolean(item.rating?.review);
  const attribution = getProfileContentAttribution(item.content) || undefined;

  return (
    <article>
      <Link
        to="/content/$id"
        params={{ id: String(item.content.id) }}
        hash={hasReview ? "ratings" : undefined}
        preload="intent"
        aria-label={
          hasReview
            ? `Open review for ${item.content.title}`
            : `Open ${item.content.title}`
        }
        className="block rounded-lg outline-none focus-visible:ring-4 focus-visible:ring-white/80"
      >
        <MediaListItem
          title={item.content.title}
          titleIcon={
            <ContentIcon
              aria-label={contentTypeLabel}
              className="h-4 w-4 md:h-5 md:w-5"
            />
          }
          description={attribution}
          image={item.content.poster}
          imageAlt={`${item.content.title} artwork`}
          mediaFallback={
            <ContentIcon aria-hidden="true" className="h-10 w-10" />
          }
          variant="review"
          className="h-64 md:h-52"
          trailingContent={<ProgressListIndicators item={item} />}
        >
          <ProgressDates item={item} />
          {item.rating?.review ? (
            <p className="mt-3 line-clamp-3 max-w-[75ch] text-sm leading-6 text-white/80">
              {item.rating.spoiler ? (
                <span className="font-semibold text-amber-200">Spoiler · </span>
              ) : null}
              {item.rating.review}
            </p>
          ) : (
            <p className="mt-3 text-sm text-white/55">
              {item.rating ? "Rating only" : "No review attached"}
            </p>
          )}
        </MediaListItem>
      </Link>
    </article>
  );
}

function ProgressListIndicators({ item }: { item: PublicProgressItem }) {
  return (
    <div className="flex items-center gap-2">
      {item.rating ? (
        <RatingBadge
          rating={Number(item.rating.score)}
          variant="user"
          className={RATING_BADGE_CLASS}
        />
      ) : null}
      {item.is_favorite ? <FavoriteBadge /> : null}
      {item.rating?.review ? (
        <ReviewIndicator
          contentId={item.content.id}
          title={item.content.title}
        />
      ) : null}
    </div>
  );
}

function ProgressDates({ item }: { item: PublicProgressItem }) {
  const activityDate =
    item.status === "completed" && item.completed_at
      ? `Completed ${formatProfileDate(item.completed_at)}`
      : `Updated ${formatProfileDate(item.updated_at)}`;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/65">
      <span className="rounded-full bg-white/10 px-2.5 py-1 font-semibold text-white/85">
        {progressLabel(item.status)}
      </span>
      <span>{activityDate}</span>
      {item.content.date ? (
        <>
          <span aria-hidden="true">·</span>
          <span>Released {formatProfileDate(item.content.date)}</span>
        </>
      ) : null}
    </div>
  );
}

export function progressLabel(status: PublicProgressItem["status"]) {
  return {
    backlog: "Planned",
    in_progress: "In progress",
    completed: "Completed",
    on_hold: "On hold",
    dropped: "Dropped",
  }[status];
}
