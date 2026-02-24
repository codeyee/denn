"use client";

import { useMemo, useCallback } from "react";
import { Card } from "../Card";
import { ListItem, UserListDetail } from "@/lib/types";
import { getContentTypeIcon } from "@/lib/icons/contentTypeIcons";
import { buildContentUrl } from "@/lib/utils/navigationUtils";
import { getSourceApi } from "@/lib/utils/contentTypeUtils";
import { StatusBadge } from "@/app/_components/common/ui/StatusBadge";
import { RatingBadge } from "@/app/_components/common/ui/RatingBadge";
import { useSmartNavigation } from "@/app/_hooks/useSmartNavigation";
import { getListItemTitle, getListItemSubtitle } from "./utils";
import { ListItemCardHover } from "./components/ListItemCardHover";
import { getRatingBadgeData } from "@/app/_components/pages/ListDetailPage/utils";

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

  const getNavigationUrl = useCallback(() => {
    return buildContentUrl({
      externalId: String(contentItem.external_id),
      sourceApi: getSourceApi(contentItem.content_type),
      contentType: contentItem.content_type,
    });
  }, [contentItem]);

  const navigation = useSmartNavigation(getNavigationUrl);

  const handleCardClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("button")) {
        return;
      }
      navigation.handleClick(e);
    },
    [navigation]
  );

  return (
    <div
      onClick={handleCardClick}
      className={`cursor-pointer relative group max-h-[400px] sm:max-h-none transition-all duration-200 ${className || ""
        }`}
      role="button"
      tabIndex={0}
      onKeyDown={navigation.handleKeyDown}
      aria-label={`View details for ${title}`}
    >
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
          <ListItemCardHover
            item={item}
            subtitle={subtitle}
            list={list}
            onToggleStatus={onToggleStatus}
            onDelete={onDelete}
            onRateClick={onRateClick}
            showRatingInvitation={showRatingInvitation}
          />
        }
      >
        {/* Badges - Positioned absolutely over the card image */}
        <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-2">
          {item.status && (
            <StatusBadge
              status={item.status}
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
          {/* Metadata: Original Title / Authors / TV Show Name */}
          {subtitle && (
            <div className="text-white/60 text-xs line-clamp-3">
              {subtitle}
            </div>
          )}
        </Card.Footer>
      </Card>
    </div>
  );
}
