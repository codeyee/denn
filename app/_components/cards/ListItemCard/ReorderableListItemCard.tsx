"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import ListItemCard from "./index";
import { ListItem } from "@/types";

interface ReorderableListItemCardProps {
  item: ListItem;
  onToggleStatus: (itemId: number, currentStatus: string) => void;
  onDelete: (itemId: number) => void;
  isReorderMode: boolean;
}

export function ReorderableListItemCard({
  item,
  onToggleStatus,
  onDelete,
  isReorderMode,
}: ReorderableListItemCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    disabled: !isReorderMode,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {isReorderMode && (
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 z-10 cursor-grab active:cursor-grabbing p-2 bg-black/70 hover:bg-black/90 rounded-lg transition-colors touch-none"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-5 h-5 text-white" />
        </div>
      )}
      <ListItemCard
        item={item}
        onToggleStatus={onToggleStatus}
        onDelete={onDelete}
        className={isReorderMode ? "pointer-events-none select-none" : ""}
      />
    </div>
  );
}
