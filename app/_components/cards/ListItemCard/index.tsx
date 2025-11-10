"use client";

import { useRouter } from "next/navigation";
import Card from "../Card";
import { Button } from "../../lib/button";
import { Circle, CheckCircle, Trash2 } from "lucide-react";
import { ListItem } from "@/types";
import {
  ItemStatus,
  Author,
} from "@/lib/api/types";
import { getContentTypeIcon } from "@/lib/utils/contentTypeUtils";
import { formatReleaseDate } from "@/lib/utils/dateUtils";

interface ListItemCardProps {
  item: ListItem;
  onToggleStatus: (itemId: number, currentStatus: string) => void;
  onDelete: (itemId: number) => void;
  className?: string;
}

export default function ListItemCard({
  item,
  onToggleStatus,
  onDelete,
  className,
}: ListItemCardProps) {
  const router = useRouter();

  const contentItem = item.content_item;
  const sourceData = contentItem.source_data;
  const imageUrl = sourceData?.image_url;

  // For seasons, display as "TV Show Title - Season Title"
  const isSeason = contentItem.content_type === "SEASON";
  const title = isSeason &&
                "tv_show_name" in sourceData &&
                sourceData.tv_show_name &&
                sourceData.title
    ? `${sourceData.tv_show_name} - ${sourceData.title}`
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
    const params = new URLSearchParams({
      external_id: String(contentItem.external_id),
      source_api: contentItem.source_api,
      content_type: contentItem.content_type,
    });
    const url = `/content?${params.toString()}`;

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

                {/* Status and Order Info */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/60">Position:</span>
                    <span className="text-sm font-semibold">#{item.list_order}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/60">Status:</span>
                    <span className={`text-sm font-semibold ${
                      item.status === ItemStatus.COMPLETED
                        ? 'text-green-400'
                        : 'text-yellow-400'
                    }`}>
                      {item.status === ItemStatus.COMPLETED ? 'Completed' : 'Pending'}
                    </span>
                  </div>
                </div>

                {/* Ratings Info */}
                {(item.list_rating || item.member_rating_count > 0) && (
                  <div className="flex items-center gap-3 flex-wrap">
                    {item.list_rating && (
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="text-sm font-semibold text-yellow-400">
                          {item.list_rating}
                        </span>
                      </div>
                    )}
                    {item.member_rating_count > 0 && (
                      <span className="text-xs text-white/60">
                        {item.member_rating_count} {item.member_rating_count === 1 ? 'rating' : 'ratings'}
                      </span>
                    )}
                  </div>
                )}

                {/* Dates */}
                <div className="space-y-1.5 text-xs text-white/60">
                  <div>
                    <span className="text-white/50">Added:</span> {formatReleaseDate(item.added_at)}
                  </div>
                  {item.completed_at && (
                    <div>
                      <span className="text-white/50">Completed:</span> {formatReleaseDate(item.completed_at)}
                    </div>
                  )}
                  {item.added_by && (
                    <div>
                      <span className="text-white/50">Added by:</span> {item.added_by.username}
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

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-white/10">
                <Button
                  variant="outline"
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
                  className="flex-1 cursor-pointer hover:bg-white/20 bg-white/10 border-white/20 transition-colors"
                >
                  {item.status === ItemStatus.COMPLETED ? (
                    <>
                      <Circle className="w-4 h-4 mr-2" />
                      <span className="text-xs">Mark as Pending</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
                      <span className="text-xs">Mark Complete</span>
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.id);
                  }}
                  className="cursor-pointer bg-red-500/20 hover:bg-red-500/40 text-red-400 hover:text-red-300 transition-colors"
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
            <div
              className={`px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm ${
                item.status === ItemStatus.COMPLETED
                  ? "bg-green-500/80 text-white border border-green-400/50"
                  : "bg-white/20 text-white border border-white/30"
              }`}
            >
              {item.status === ItemStatus.COMPLETED ? "COMPLETED" : "PENDING"}
            </div>
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
            <div className="text-white/60 text-xs line-clamp-1">
              {subtitle}
            </div>
          )}
        </Card.Footer>
      </Card>
    </div>
  );
}
