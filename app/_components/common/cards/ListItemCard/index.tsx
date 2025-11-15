"use client";

import { useMemo, useCallback } from "react";
import { Card } from "../Card";
import { ListItem } from "@/types";
import { getContentTypeIcon } from "@/lib/icons/contentTypeIcons";
import { buildContentUrl } from "@/lib/utils/navigationUtils";
import { StatusBadge } from "@/app/_components/common/ui/StatusBadge";
import { useSmartNavigation } from "@/app/_hooks/useSmartNavigation";
import { getListItemTitle, getListItemSubtitle } from "./utils";
import { ListItemCardHover } from "./components/ListItemCardHover";

interface ListItemCardProps {
  item: ListItem;
  onToggleStatus: (itemId: number, currentStatus: string) => void;
  onDelete: (itemId: number) => void;
  onRateClick?: () => void;
  showRatingInvitation?: boolean;
  className?: string;
  disableHover?: boolean;
}

export function ListItemCard({
  item,
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

  const getNavigationUrl = useCallback(() => {
    return buildContentUrl({
      externalId: String(contentItem.external_id),
      sourceApi: contentItem.source_api,
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
      className={`cursor-pointer relative group max-h-[400px] sm:max-h-none transition-all duration-200 ${
        className || ""
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
            onToggleStatus={onToggleStatus}
            onDelete={onDelete}
            onRateClick={onRateClick}
            showRatingInvitation={showRatingInvitation}
          />
        }
      >
        {/* Status Badge - Positioned absolutely over the card image */}
        {item.status && (
          <div className="absolute top-3 right-3 z-20">
            <StatusBadge
              status={item.status}
              className="backdrop-blur-sm"
            />
          </div>
        )}

        {/* Item Number Badge - Positioned absolutely over the card image */}
        <div className="absolute top-3 left-3 z-20">
          <div className="bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full text-white/90 text-xs font-mono font-semibold">
            #{item.list_order}
          </div>
        </div>

        {/* Footer Content - Simple info, no buttons (buttons only in hover) */}
        <Card.Footer className="flex-col gap-2">
          {/* Metadata: Rating */}
          {item.list_rating && (
            <div className="flex items-center gap-2 text-xs text-yellow-400 font-medium">
              <span className="text-yellow-400 font-medium">
                ★ {item.list_rating}
              </span>
            </div>
          )}

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
