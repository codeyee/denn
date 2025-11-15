"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ListItemCard } from "./index";
import { ListItem } from "@/types";

interface ReorderableListItemCardProps {
  item: ListItem;
  activeId: number | null;
  onToggleStatus: (itemId: number, currentStatus: string) => void;
  onDelete: (itemId: number) => void;
  onRateClick?: () => void;
  showRatingInvitation?: boolean;
  isReorderMode: boolean;
}

export function ReorderableListItemCard({
  item,
  activeId,
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
      style={style}
      {...(isReorderMode ? { ...attributes, ...listeners } : {})}
      className={`${isReorderMode && !isDragging ? "cursor-grab animate-reorder-wiggle" : ""} ${isDragging ? "cursor-grabbing opacity-0" : ""}`}
    >
      <ListItemCard
        item={item}
        onToggleStatus={onToggleStatus}
        onDelete={onDelete}
        onRateClick={onRateClick}
        showRatingInvitation={showRatingInvitation}
        className={isReorderMode ? "pointer-events-none select-none" : ""}
        disableHover={isReorderMode}
      />
    </div>
  );
}
