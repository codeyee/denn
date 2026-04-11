import { ListItem, UserListDetail } from "@/lib/types";
import { VerticalList } from "../../../../common/lists/VerticalList";
import { ListItemRenderer } from "../ListItemRenderer";

interface FlatListViewProps {
  items: ListItem[];
  highlightedItemId: number | null;
  list: UserListDetail;
  currentUserId?: number;
  onToggleStatus: (itemId: number, currentStatus: string) => void;
  onDelete: (itemId: number) => void;
  onRate: (item: ListItem) => void;
  shouldInviteToRate: (item: ListItem) => boolean;
}

export function FlatListView({
  items,
  highlightedItemId,
  list,
  currentUserId,
  onToggleStatus,
  onDelete,
  onRate,
  shouldInviteToRate,
}: FlatListViewProps) {
  return (
    <VerticalList spacing="md">
      {items.map((item) => (
        <ListItemRenderer
          key={item.id}
          item={item}
          activeId={null}
          isHighlighted={item.id === highlightedItemId}
          isReorderMode={false}
          list={list}
          currentUserId={currentUserId}
          onToggleStatus={onToggleStatus}
          onDelete={onDelete}
          onRate={onRate}
          shouldInviteToRate={shouldInviteToRate}
        />
      ))}
    </VerticalList>
  );
}
