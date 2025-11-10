"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import Card from "../Card";
import { Button } from "../../lib/button";
import { Circle, CheckCircle, Trash2 } from "lucide-react";
import { ListItem } from "@/types";
import {
  ItemStatus,
  AlbumDetail,
  BookDetail,
  TVSeasonDetail,
  Author,
} from "@/lib/api/types";
import { getContentTypeIcon } from "@/lib/utils/contentTypeUtils";

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
  const middleClickHandled = useRef(false);

  const contentItem = item.content_item;
  const sourceData = contentItem.source_data;
  const imageUrl = sourceData?.image_url;
  const title = sourceData?.title || "Untitled";

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
    if (
      contentItem.content_type === "SEASON" &&
      "tv_show_name" in sourceData &&
      sourceData.type === "SEASON"
    ) {
      return sourceData.tv_show_name;
    }
    return "";
  };

  return (
    <div
      onClick={handleCardClick}
      className={`cursor-pointer relative group max-h-[400px] sm:max-h-none ${
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

        {/* Footer Content */}
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
          <div className="text-white/60 text-xs line-clamp-1">
            {getSubTitle()}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-2 w-full">
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
              className="flex-1 cursor-pointer hover:bg-white/20 bg-white/10 border-white/20"
            >
              {item.status === ItemStatus.COMPLETED ? (
                <>
                  <Circle className="w-4 h-4 mr-1" />
                  <span className="text-xs">Mark as Pending</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-1 text-green-400" />
                  <span className="text-xs">Mark as Completed</span>
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
              className="cursor-pointer bg-red-500/20 hover:bg-red-500/40 text-red-400 hover:text-red-300"
              title="Remove item"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </Card.Footer>
      </Card>
    </div>
  );
}
