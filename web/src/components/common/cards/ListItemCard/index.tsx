
import {
  useMemo,
  useCallback,
  useState,
  type MouseEvent,
} from "react";
import { Link } from "@tanstack/react-router";
import { Card } from "../Card";
import { ListItem, UserListDetail } from "@/lib/types";
import { getContentTypeIcon } from "@/lib/icons/contentTypeIcons";
import { StatusBadge } from "@/components/common/ui/StatusBadge";
import { RatingBadge } from "@/components/common/ui/RatingBadge";
import { usePrefetchContentDetail } from "@/lib/api/queries/usePrefetchContentDetail";
import { useHoverPrefetch } from "@/lib/perf/useHoverPrefetch";
import { getListItemTitle, getListItemSubtitle } from "./utils";
import { ListItemCardHover } from "./components/ListItemCardHover";
import { getRatingBadgeData } from "@/components/pages/ListDetailPage/utils";
import { ListItemTrackingSection } from "@/components/common/tracking/ListItemTrackingSection";

interface ListItemCardProps {
  item: ListItem;
  list: UserListDetail;
  currentUserId?: number;
  onToggleStatus: (itemId: number, currentStatus: string) => void;
  onDelete: (itemId: number) => void;
  onRateClick?: () => void;
  showRatingInvitation?: boolean;
  className?: string;
  disableHover?: boolean;
}

export function ListItemCard({
  item,
  list,
  currentUserId,
  onToggleStatus,
  onDelete,
  onRateClick,
  showRatingInvitation = false,
  className,
  disableHover = false,
}: ListItemCardProps) {
  const contentItem = item.content_item;
  const [isNavigating, setIsNavigating] = useState(false);
  const sourceData = contentItem.source_data;
  const imageUrl = sourceData?.image_url;

  const title = useMemo(() => getListItemTitle(item), [item]);
  const subtitle = useMemo(() => getListItemSubtitle(item), [item]);
  const ContentIcon = useMemo(
    () => getContentTypeIcon(contentItem.content_type),
    [contentItem.content_type]
  );

  // Get rating badge data
  const ratingData = useMemo(
    () => getRatingBadgeData(item, list, currentUserId),
    [item, list, currentUserId]
  );

  // T8: warm the ContentDetail cache after 200ms of hover intent.
  // The ContentItem id is already known (no `getOrCreate` round-trip
  // needed), so we go straight to `prefetchQuery`.
  const prefetchContentDetail = usePrefetchContentDetail();
  const handlePrefetch = useCallback(() => {
    prefetchContentDetail(contentItem.id);
  }, [contentItem.id, prefetchContentDetail]);
  const hoverPrefetchHandlers = useHoverPrefetch(handlePrefetch);
  const handleNavigation = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      if (isNavigating) {
        event.preventDefault();
        return;
      }
      setIsNavigating(true);
    },
    [isNavigating],
  );

  return (
    <div
      className={`relative group max-h-[400px] sm:max-h-none transition-all duration-200 ${className || ""
        }`}
      {...hoverPrefetchHandlers}
    >
      <Link
        to="/content/$id"
        params={{ id: String(contentItem.id) }}
        preload="intent"
        onClick={handleNavigation}
        className="absolute inset-0 z-10 rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-white/80"
        aria-label={`View details for ${title}`}
      />
      <Card
        id={item.id}
        title={title}
        icon={ContentIcon}
        backgroundImage={imageUrl || ""}
        backgroundImageAlt={`${title} cover image`}
        isEmpty={!imageUrl}
        className="h-full"
        disableHover={disableHover}
        hoverContent={
          <div className="relative z-20">
            <ListItemCardHover
              item={item}
              subtitle={subtitle}
              list={list}
              onToggleStatus={onToggleStatus}
              onDelete={onDelete}
              onRateClick={onRateClick}
              showRatingInvitation={showRatingInvitation}
            />
          </div>
        }
      >
        {/* Badges - Positioned absolutely over the card image */}
        <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-2">
          {list.list_type === "SHARED" && item.context_status && (
            <StatusBadge
              status={item.context_status}
              className="backdrop-blur-md bg-black/40 shadow-lg"
            />
          )}
          {ratingData.showUserRating && (
            <RatingBadge
              rating={ratingData.userRating}
              variant="user"
              size="compact"
              className="backdrop-blur-md bg-black/40 shadow-lg"
            />
          )}
          {ratingData.showListRating && (
            <RatingBadge
              rating={ratingData.listRating}
              count={item.member_rating_count}
              variant="list"
              size="compact"
              className="backdrop-blur-md bg-black/40 shadow-lg"
            />
          )}
        </div>

        {/* Item Number Badge - Positioned absolutely over the card image */}
        <div className="absolute top-3 left-3 z-20">
          <div className="bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full text-white/90 text-xs font-mono font-semibold">
            #{item.list_order}
          </div>
        </div>

        {/* Footer Content - Simple info, no buttons (buttons only in hover) */}
        <Card.Footer className="flex-col gap-2">
          <div className="relative z-20">
            <ListItemTrackingSection
              item={item}
              onRate={() => onRateClick?.()}
              compact
            />
          </div>
          {/* Metadata: Original Title / Authors / TV Show Name */}
          {subtitle && (
            <div className="text-white/60 text-xs line-clamp-3">
              {subtitle}
            </div>
          )}
        </Card.Footer>
      </Card>
      {isNavigating && (
        <div
          className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-xl bg-black/55 text-sm font-medium text-white"
          role="status"
        >
          Opening details…
        </div>
      )}
    </div>
  );
}
