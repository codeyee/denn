import { Star } from "lucide-react";
import { useMemo } from "react";
import { ListItem, MemberRating } from "@/types";
import { Author, ItemStatus } from "@/lib/api/types";
import { ReorderableListItem } from "../../../common/lists/ReorderableListItem";
import { Button } from "../../../lib/button";
import { getContentTypeIcon } from "@/lib/utils/contentTypeIcons";
import { formatReleaseDate } from "@/lib/utils/dateUtils";
import { formatSeasonTitle } from "@/lib/utils/titleUtils";

interface ListItemRendererProps {
  item: ListItem;
  activeId: number | null;
  isReorderMode: boolean;
  onToggleStatus: (itemId: number, currentStatus: string) => void;
  onDelete: (itemId: number) => void;
  onRate: (item: ListItem) => void;
  shouldInviteToRate: (item: ListItem) => boolean;
}

export function ListItemRenderer({
  item,
  activeId,
  isReorderMode,
  onToggleStatus,
  onDelete,
  onRate,
  shouldInviteToRate,
}: ListItemRendererProps) {
  const contentItem = item.content_item;
  const sourceData = contentItem.source_data;
  const ContentIcon = useMemo(() => getContentTypeIcon(contentItem.content_type), [contentItem.content_type]);
  const imageUrl = sourceData?.image_url;

  const isSeason = contentItem.content_type === "SEASON";
  const title =
    isSeason && "tv_show_name" in sourceData
      ? formatSeasonTitle(sourceData.tv_show_name, sourceData.title)
      : sourceData?.title || "Untitled";

  return (
    <ReorderableListItem
      key={item.id}
      id={item.id}
      activeId={activeId}
      isReorderMode={isReorderMode}
      title={title}
      description={
        "original_title" in sourceData &&
        sourceData.original_title !== sourceData.title
          ? sourceData.original_title
          : undefined
      }
      subDescription={
        (contentItem.content_type === "ALBUM" ||
          contentItem.content_type === "BOOK") &&
        "authors" in sourceData &&
        sourceData.authors
          ? (sourceData.authors as Author[])
              ?.map((author) => author.name)
              .join(", ")
          : undefined
      }
      rating={item.list_rating}
      image={imageUrl}
      imageAlt={sourceData?.title}
      imageFullHeight={true}
      leadingContent={
        <div className="flex items-center gap-3">
          <div className="text-white/60 text-sm font-mono w-8 text-center">
            #{item.list_order}
          </div>
          <ContentIcon className="w-5 h-5 text-white/60 shrink-0" />
        </div>
      }
      expandedContent={
        <div className="space-y-4">
          {item.notes && (
            <div>
              <h4 className="text-sm font-semibold text-white/80 mb-2">
                Notes
              </h4>
              <p className="text-white/60 text-sm">{item.notes}</p>
            </div>
          )}
          <div>
            <h4 className="text-sm font-semibold text-white/80 mb-2">
              Details
            </h4>
            <div className="space-y-1 text-sm text-white/60">
              <p>Added by {item.added_by.username}</p>
              <p>Added on {formatReleaseDate(item.added_at)}</p>
              {item.completed_at && (
                <p>Completed on {formatReleaseDate(item.completed_at)}</p>
              )}
            </div>
          </div>
          {item.member_ratings &&
            Array.isArray(item.member_ratings) &&
            item.member_ratings.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-white/80 mb-2">
                  Member Ratings
                </h4>
                <div className="space-y-1">
                  {item.member_ratings.map((rating: MemberRating, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className="text-white/60">
                        {rating.user?.username || "Unknown"}
                      </span>
                      <span className="text-yellow-400">
                        ★ {rating.rating}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onToggleStatus(item.id, item.status)}
            >
              {item.status === ItemStatus.COMPLETED
                ? "Mark Pending"
                : "Mark Complete"}
            </Button>
            {shouldInviteToRate(item) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRate(item)}
              >
                <Star className="w-4 h-4 mr-1" />
                Rate
              </Button>
            )}
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onDelete(item.id)}
            >
              Delete
            </Button>
          </div>
        </div>
      }
      trailingContent={
        <div className="flex items-center gap-3">
          {item.status && (
            <div
              className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                item.status === ItemStatus.COMPLETED
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-white/10 text-white/80 border border-white/20"
              }`}
            >
              {item.status === ItemStatus.COMPLETED ? "COMPLETED" : "PENDING"}
            </div>
          )}
          {item.list_rating && (
            <div className="text-yellow-400 text-sm font-medium">
              ★ {item.list_rating}
            </div>
          )}
        </div>
      }
    />
  );
}
