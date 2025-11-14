"use client";

import { useRouter } from "next/navigation";
import Card from "../Card";
import { Button } from "../../lib/button";
import { Circle, CheckCircle, Trash2, Star } from "lucide-react";
import { ListItem } from "@/types";
import {
  ItemStatus,
  Author,
} from "@/lib/api/types";
import { getContentTypeIcon } from "@/lib/utils/contentTypeUtils";
import { formatReleaseDate } from "@/lib/utils/dateUtils";
import { formatSeasonTitle } from "@/lib/utils/titleUtils";
import { formatUserDisplayName } from "@/lib/utils/userUtils";
import { buildContentUrl } from "@/lib/utils/navigationUtils";
import { StatusBadge } from "@/app/_components/common/StatusBadge";

interface ListItemCardProps {
  item: ListItem;
  onToggleStatus: (itemId: number, currentStatus: string) => void;
  onDelete: (itemId: number) => void;
  onRateClick?: () => void;
  showRatingInvitation?: boolean;
  className?: string;
  disableHover?: boolean;
}

export default function ListItemCard({
  item,
  onToggleStatus,
  onDelete,
  onRateClick,
  showRatingInvitation = false,
  className,
  disableHover = false,
}: ListItemCardProps) {
  const router = useRouter();

  const contentItem = item.content_item;
  const sourceData = contentItem.source_data;
  const imageUrl = sourceData?.image_url;

  // For seasons, format title to avoid redundancy
  const isSeason = contentItem.content_type === "SEASON";
  const title = isSeason && "tv_show_name" in sourceData
    ? formatSeasonTitle(sourceData.tv_show_name, sourceData.title)
    : sourceData?.title || "Untitled";

  const ContentIcon = getContentTypeIcon(contentItem.content_type);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on buttons
    const target = e.target as HTMLElement;
    if (target.closest("button")) {
      return;
    }

    e.stopPropagation();

    // Navigate to content detail page
    const url = buildContentUrl({
      externalId: String(contentItem.external_id),
      sourceApi: contentItem.source_api,
      contentType: contentItem.content_type,
    });

    // Check for Ctrl/Cmd+click to open in new tab
    const isModifierClick = e.ctrlKey || e.metaKey;

    if (isModifierClick) {
      const newWindow = window.open(url, "_blank");
      if (newWindow) {
        newWindow.blur();
        window.focus();
      }
    } else {
      router.push(url);
    }
  };

  const getSubTitle = () => {
    // Skip subtitle for seasons since it's now in the title
    if (contentItem.content_type === "SEASON") {
      return "";
    }
    if (
      "original_title" in sourceData &&
      sourceData.original_title &&
      sourceData.original_title !== sourceData.title
    ) {
      return sourceData.original_title;
    }
    if (
      (contentItem.content_type === "ALBUM" ||
        contentItem.content_type === "BOOK") &&
      "authors" in sourceData &&
      sourceData.authors
    ) {
      return (sourceData.authors as Author[])
        ?.map((author) => author.name)
        .join(", ");
    }
    return "";
  };

  const subtitle = getSubTitle();

  return (
    <div
      onClick={handleCardClick}
      className={`cursor-pointer relative group max-h-[400px] sm:max-h-none transition-all duration-200 ${
        className || ""
      }`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick(e as any);
        }
      }}
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
          <Card.HoverContent>
            <div className="space-y-4 text-white">
              {/* Metadata Section */}
              <div className="space-y-3">
                {/* Subtitle (Original Title / Authors / TV Show) */}
                {subtitle && (
                  <div className="text-sm text-white/80">
                    {subtitle}
                  </div>
                )}

                {/* Position and Status Info */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/60">Position:</span>
                    <span className="text-sm font-semibold">#{item.list_order}</span>
                  </div>
                  {/* Status badge as tag component (consistent with non-hover) */}
                  {item.status && (
                    <StatusBadge status={item.status} size="sm" />
                  )}
                </div>

                {/* List Item Details */}
                <div className="space-y-2 text-xs">
                  {/* Added by */}
                  {item.added_by && (
                    <div>
                      <span className="text-white/50">Added by:</span>{" "}
                      <span className="text-white/80">
                        {formatUserDisplayName(item.added_by)}
                      </span>
                    </div>
                  )}
                  {/* Added on */}
                  <div>
                    <span className="text-white/50">Added on:</span>{" "}
                    <span className="text-white/80">{formatReleaseDate(item.added_at)}</span>
                  </div>
                  {/* Completed on */}
                  {item.completed_at && (
                    <div>
                      <span className="text-white/50">Completed on:</span>{" "}
                      <span className="text-white/80">{formatReleaseDate(item.completed_at)}</span>
                    </div>
                  )}
                  {/* List Rating */}
                  {item.list_rating && (
                    <div>
                      <span className="text-white/50">List Rating:</span>{" "}
                      <span className="text-yellow-400 font-medium">★ {item.list_rating}</span>
                    </div>
                  )}
                  {/* Member Rating Count */}
                  {item.member_rating_count > 0 && (
                    <div>
                      <span className="text-white/50">Member Ratings:</span>{" "}
                      <span className="text-white/80">
                        {item.member_rating_count} {item.member_rating_count === 1 ? 'rating' : 'ratings'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {item.notes && (
                  <div className="pt-2 border-t border-white/10">
                    <p className="text-xs text-white/50 mb-1">Notes:</p>
                    <p className="text-sm text-white/80 line-clamp-3">
                      {item.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Rating Invitation */}
              {showRatingInvitation && onRateClick && (
                <div className="pt-2 mt-2 border-t border-white/10">
                  <div className="bg-yellow-600/10 border border-yellow-600/30 rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-yellow-400 font-semibold text-xs">
                          Rate this item
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRateClick();
                        }}
                        className="shrink-0 bg-yellow-600 hover:bg-yellow-700 text-white cursor-pointer px-2 py-1 text-xs"
                      >
                        Rate
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-white/10">
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleStatus(item.id, item.status);
                  }}
                  title={
                    item.status === ItemStatus.COMPLETED
                      ? "Mark as Pending"
                      : "Mark as Completed"
                  }
                  className={`flex-1 cursor-pointer font-semibold transition-colors ${
                    item.status === ItemStatus.COMPLETED
                      ? "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                      : "bg-green-600 hover:bg-green-700 text-white"
                  }`}
                >
                  {item.status === ItemStatus.COMPLETED ? (
                    <>
                      <Circle className="w-4 h-4 mr-2" />
                      <span className="text-xs">Mark as Pending</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      <span className="text-xs">Mark Complete</span>
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.id);
                  }}
                  className="cursor-pointer bg-red-600/20 hover:bg-red-600/40 text-red-400 hover:text-red-300 border border-red-600/30 transition-colors"
                  title="Remove item from list"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card.HoverContent>
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
