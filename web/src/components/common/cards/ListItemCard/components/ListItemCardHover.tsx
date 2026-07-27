import { Button } from "@/components/common/ui/Button";
import { StatusBadge } from "@/components/common/ui/StatusBadge";
import { Circle, CheckCircle, Trash2, Star } from "lucide-react";
import { ListItem, UserListDetail } from "@/lib/types";
import { ItemStatus } from "@/lib/types";
import { formatReleaseDate } from "@/lib/utils/dateUtils";
import { formatUserDisplayName } from "@/lib/utils/userUtils";
import { isPersonalList } from "@/components/pages/ListDetailPage/utils";
import { Card } from "../../Card";
import { ListItemTrackingSection } from "@/components/common/tracking/ListItemTrackingSection";

interface ListItemCardHoverProps {
  item: ListItem;
  subtitle: string;
  list: UserListDetail;
  onToggleStatus: (itemId: number, currentStatus: string) => void;
  onDelete: (itemId: number) => void;
  onRateClick?: () => void;
  showRatingInvitation?: boolean;
}

export function ListItemCardHover({
  item,
  subtitle,
  list,
  onToggleStatus,
  onDelete,
  onRateClick,
  showRatingInvitation = false,
}: ListItemCardHoverProps) {
  const personal = isPersonalList(list);
  return (
    <Card.HoverContent>
      <div className="space-y-4 text-white">
        <div className="space-y-3">
          {subtitle && <div className="text-sm text-white/80">{subtitle}</div>}

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/60">Position:</span>
              <span className="text-sm font-semibold">#{item.list_order}</span>
            </div>
            {!personal && item.context_status ? (
              <StatusBadge status={item.context_status} variant="compact" />
            ) : null}
          </div>

          <div className="space-y-2 text-xs">
            {!personal && item.added_by && (
              <div>
                <span className="text-white/50">Added by:</span>{" "}
                <span className="text-white/80">
                  {formatUserDisplayName(item.added_by)}
                </span>
              </div>
            )}
            <div>
              <span className="text-white/50">Added on:</span>{" "}
              <span className="text-white/80">
                {formatReleaseDate(item.added_at)}
              </span>
            </div>
            {!personal && item.context_completed_at && (
              <div>
                <span className="text-white/50">List completed on:</span>{" "}
                <span className="text-white/80">
                  {formatReleaseDate(item.context_completed_at)}
                </span>
              </div>
            )}
            {!personal && item.member_rating_count > 0 && (
              <div>
                <span className="text-white/50">Ratings:</span>{" "}
                <span className="text-white/80">
                  {item.member_rating_count}{" "}
                  {item.member_rating_count === 1 ? "rating" : "ratings"}
                </span>
              </div>
            )}
          </div>
        </div>

        <ListItemTrackingSection
          item={item}
          onRate={() => onRateClick?.()}
          compact
        />

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

        <div className="flex gap-2 pt-2 border-t border-white/10">
          {!personal ? (
            <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onToggleStatus(
                item.id,
                item.context_status ?? ItemStatus.PENDING,
              );
            }}
            title={
              item.context_status === ItemStatus.COMPLETED
                ? "Mark pending in this list"
                : "Mark completed in this list"
            }
            className={`flex-1 cursor-pointer font-semibold transition-colors ${
              item.context_status === ItemStatus.COMPLETED
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
  );
}
