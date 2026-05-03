import { ListItem, UserListDetail } from "@/lib/types";
import { ListItemCard } from "../../../../common/cards/ListItemCard";

interface FlatGalleryViewProps {
  items: ListItem[];
  highlightedItemId: number | null;
  list: UserListDetail;
  currentUserId?: number;
  onToggleStatus: (itemId: number, currentStatus: string) => void;
  onDelete: (itemId: number) => void;
  onRate: (item: ListItem) => void;
  shouldInviteToRate: (item: ListItem) => boolean;
}

export function FlatGalleryView({
  items,
  highlightedItemId,
  list,
  currentUserId,
  onToggleStatus,
  onDelete,
  onRate,
  shouldInviteToRate,
}: FlatGalleryViewProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-6 5xl:grid-cols-7 6xl:grid-cols-8 gap-4">
      {items.map((item) => (
        <div
          key={item.id}
          data-list-item-id={item.id}
        >
          <ListItemCard
            item={item}
            list={list}
            currentUserId={currentUserId}
            onToggleStatus={onToggleStatus}
            onDelete={onDelete}
            onRateClick={() => onRate(item)}
            showRatingInvitation={shouldInviteToRate(item)}
            className={
              item.id === highlightedItemId
                ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-background-logged-in rounded-2xl"
                : undefined
            }
          />
        </div>
      ))}
    </div>
  );
}
