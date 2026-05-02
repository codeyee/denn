
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ListItemCard } from "./index";
import { ListItem, UserListDetail } from "@/lib/types";

interface ReorderableListItemCardProps {
  item: ListItem;
  activeId: number | null;
  isHighlighted?: boolean;
  list: UserListDetail;
  currentUserId?: number;
  onToggleStatus: (itemId: number, currentStatus: string) => void;
  onDelete: (itemId: number) => void;
  onRateClick?: () => void;
  showRatingInvitation?: boolean;
  isReorderMode: boolean;
}

export function ReorderableListItemCard({
  item,
  activeId,
  isHighlighted = false,
  list,
  currentUserId,
  onToggleStatus,
  onDelete,
  onRateClick,
  showRatingInvitation,
  isReorderMode,
}: ReorderableListItemCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: item.id,
    disabled: !isReorderMode,
  });

  const isDragging = activeId === item.id;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 200ms ease",
  };

  return (
    <div
      ref={setNodeRef}
      data-list-item-id={item.id}
      style={style}
      {...(isReorderMode ? { ...attributes, ...listeners } : {})}
      className={`${isReorderMode && !isDragging ? "cursor-grab animate-reorder-wiggle" : ""} ${isDragging ? "cursor-grabbing opacity-0" : ""}`}
    >
      <ListItemCard
        item={item}
        list={list}
        currentUserId={currentUserId}
        onToggleStatus={onToggleStatus}
        onDelete={onDelete}
        onRateClick={onRateClick}
        showRatingInvitation={showRatingInvitation}
        className={`${isReorderMode ? "pointer-events-none select-none" : ""} ${isHighlighted ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-background-logged-in rounded-2xl" : ""}`}
        disableHover={isReorderMode}
      />
    </div>
  );
}
