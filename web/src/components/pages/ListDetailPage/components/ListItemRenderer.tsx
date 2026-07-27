import { Star, ExternalLink, Circle, CheckCircle, Trash2 } from "lucide-react";
import { ListItem, ListType, MemberRating, UserListDetail } from "@/lib/types";
import { Author, ItemStatus } from "@/lib/types";
import { ReorderableListItem } from "../../../common/lists/ReorderableListItem";
import { ExpandableListItem } from "../../../common/lists/ExpandableListItem";
import { Button } from "@/components/common/ui/Button";
import { StatusBadge } from "@/components/common/ui/StatusBadge";
import { RatingBadge } from "@/components/common/ui/RatingBadge";
import { CONTENT_TYPE_ICONS } from "@/lib/icons/contentTypeIcons";
import { formatReleaseDate } from "@/lib/utils/dateUtils";
import { formatSeasonTitle } from "@/lib/utils/titleUtils";
import { getRatingBadgeData, isPersonalList } from "../utils";
import { Film } from "lucide-react";
import { buildContentUrlById } from "@/lib/utils/navigationUtils";
import { useNavigate } from "@tanstack/react-router";
import { ListItemTrackingSection } from "@/components/common/tracking/ListItemTrackingSection";

interface ListItemRendererProps {
  item: ListItem;
  activeId: number | null;
  isHighlighted: boolean;
  isReorderMode: boolean;
  list: UserListDetail;
  currentUserId?: number;
  onToggleStatus: (itemId: number, currentStatus: string) => void;
  onDelete: (itemId: number) => void;
  onRate: (item: ListItem) => void;
  shouldInviteToRate: (item: ListItem) => boolean;
}

export function ListItemRenderer({
  item,
  activeId,
  isHighlighted,
  isReorderMode,
  list,
  currentUserId,
  onToggleStatus,
  onDelete,
  onRate,
  shouldInviteToRate,
}: ListItemRendererProps) {
  const navigate = useNavigate();
  const contentItem = item.content_item;
  const sourceData = contentItem.source_data;
  const ContentIcon = CONTENT_TYPE_ICONS[contentItem.content_type] || Film;
  const imageUrl = sourceData?.image_url;

  const isSeason = contentItem.content_type === "SEASON";
  const title =
    isSeason && sourceData && "tv_show_name" in sourceData
      ? formatSeasonTitle(
          sourceData.tv_show_name,
          sourceData.title,
          "season_number" in sourceData
            ? sourceData.season_number
            : undefined,
        )
      : sourceData?.title || "Untitled";

  // Get rating badge data
  const ratingData = getRatingBadgeData(item, list, currentUserId);
  const personal = isPersonalList(list);
  const systemManaged = list.list_type === ListType.DYNAMIC;

  const handleViewContent = () => {
    void navigate({ to: buildContentUrlById(contentItem.id) });
  };

  return (
    isReorderMode ? (
      <ReorderableListItem
        key={item.id}
        id={item.id}
        activeId={activeId}
        isReorderMode={true}
        title={title}
        description={
          sourceData &&
          "original_title" in sourceData &&
          sourceData.original_title !== sourceData.title
            ? sourceData.original_title
            : undefined
        }
        subDescription={
          (contentItem.content_type === "ALBUM" ||
            contentItem.content_type === "BOOK") &&
          sourceData &&
          "authors" in sourceData &&
          sourceData.authors
            ? (sourceData.authors as Author[]).map((author) => author.name).join(", ")
            : undefined
        }
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
      />
    ) : (
      <div
        data-list-item-id={item.id}
        className={
          isHighlighted
            ? "rounded-2xl ring-2 ring-amber-400 ring-offset-2 ring-offset-background-logged-in"
            : undefined
        }
      >
        <ExpandableListItem
          title={title}
          description={
            sourceData &&
            "original_title" in sourceData &&
            sourceData.original_title !== sourceData.title
              ? sourceData.original_title
              : undefined
          }
          subDescription={
            (contentItem.content_type === "ALBUM" ||
              contentItem.content_type === "BOOK") &&
            sourceData &&
            "authors" in sourceData &&
            sourceData.authors
              ? (sourceData.authors as Author[]).map((author) => author.name).join(", ")
              : undefined
          }
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

              <div>
                <h4 className="text-sm font-semibold text-white/80 mb-2">
                  Details
                </h4>
                <div className="space-y-1 text-sm text-white/60">
                  {!personal && <p>Added by {item.added_by.username}</p>}
                  <p>Added on {formatReleaseDate(item.added_at)}</p>
                  {!personal && item.context_completed_at ? (
                    <p>
                      List completed on{" "}
                      {formatReleaseDate(item.context_completed_at)}
                    </p>
                  ) : null}
                </div>
              </div>
              <ListItemTrackingSection item={item} onRate={onRate} />
              {!personal &&
              item.member_ratings &&
              Array.isArray(item.member_ratings) &&
              item.member_ratings.length > 0 ? (
                <div>
                  <h4 className="text-sm font-semibold text-white/80 mb-2">
                    Member Ratings
                  </h4>
                  <div className="space-y-1">
                    {item.member_ratings.map((rating: MemberRating, idx: number) => {
                      const isCurrentUser =
                        currentUserId && rating.user?.id === currentUserId;
                      const score =
                        typeof rating.score === "string"
                          ? parseFloat(rating.score)
                          : rating.score;

                      if (typeof score !== "number" || Number.isNaN(score)) {
                        return null;
                      }

                      return (
                        <div
                          key={idx}
                          className={`flex items-center gap-2 text-sm ${isCurrentUser ? "font-semibold" : ""}`}
                        >
                          <span className={isCurrentUser ? "text-white" : "text-white/60"}>
                            {rating.user?.username || "Unknown"}
                            {isCurrentUser ? " (You)" : ""}
                          </span>
                          <span className="text-yellow-400">★ {score.toFixed(1)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              <div className="flex gap-2 pt-2 flex-wrap">
                <Button
                  size="sm"
                  onClick={handleViewContent}
                  className="cursor-pointer bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 hover:text-blue-300 border border-blue-600/30 transition-colors"
                  title="View content details"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
                {!personal ? (
                  <Button
                  size="sm"
                  onClick={() =>
                    onToggleStatus(
                      item.id,
                      item.context_status ?? ItemStatus.PENDING,
                    )
                  }
                  title={
                    item.context_status === ItemStatus.COMPLETED
                      ? "Mark pending in this list"
                      : "Mark completed in this list"
                  }
                  className={`flex-1 cursor-pointer font-semibold transition-colors ${item.context_status === ItemStatus.COMPLETED
                    ? "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                    : "bg-green-600 hover:bg-green-700 text-white"
                    }`}
                >
                  {item.context_status === ItemStatus.COMPLETED ? (
                    <>
                      <Circle className="w-4 h-4 mr-2" />
                      <span className="text-xs">List: pending</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      <span className="text-xs">List: complete</span>
                    </>
                  )}
                </Button>
                ) : null}
                {shouldInviteToRate(item) ? (
                  <Button
                    size="sm"
                    onClick={() => onRate(item)}
                    className="cursor-pointer bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-400 hover:text-yellow-300 border border-yellow-600/30 transition-colors"
                    title="Rate this item"
                  >
                    <Star className="w-4 h-4" />
                  </Button>
                ) : null}
                {!systemManaged ? (
                  <Button
                    size="sm"
                    onClick={() => onDelete(item.id)}
                    className="cursor-pointer bg-red-600/20 hover:bg-red-600/40 text-red-400 hover:text-red-300 border border-red-600/30 transition-colors"
                    title="Remove item from list"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          }
          trailingContent={
            <div className="flex items-center gap-2">
              <ListItemTrackingSection item={item} onRate={onRate} compact />
              {!personal && item.context_status ? (
                <StatusBadge
                  status={item.context_status}
                  variant="compact"
                />
              ) : null}
              {ratingData.showUserRating ? (
                <RatingBadge
                  rating={ratingData.userRating}
                  variant="user"
                  size="compact"
                />
              ) : null}
              {ratingData.showListRating ? (
                <RatingBadge
                  rating={ratingData.listRating}
                  count={item.member_rating_count}
                  variant="list"
                  size="compact"
                />
              ) : null}
            </div>
          }
        />
      </div>
    )
  );
}
