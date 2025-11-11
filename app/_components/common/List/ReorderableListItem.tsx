"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import ExpandableListItem from "./ExpandableListItem";
import { ReactNode } from "react";

interface ReorderableListItemProps {
  id: number;
  title: string;
  description?: string;
  subDescription?: string;
  rating?: number | null | undefined;
  image?: string | null | undefined;
  imageAlt?: string | null | undefined;
  imageFullHeight?: boolean;
  leadingContent?: ReactNode;
  trailingContent?: ReactNode;
  expandedContent?: ReactNode;
  isReorderMode: boolean;
}

export function ReorderableListItem({
  id,
  isReorderMode,
  leadingContent,
  trailingContent,
  ...props
}: ReorderableListItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: id,
    disabled: !isReorderMode,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // In reorder mode, show drag handle as leading content and hide trailing actions
  const reorderLeadingContent = isReorderMode ? (
    <div className="flex items-center gap-3">
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-2 hover:bg-white/10 rounded transition-colors touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-5 h-5 text-white/60" />
      </button>
      {leadingContent}
    </div>
  ) : (
    leadingContent
  );

  const reorderTrailingContent = isReorderMode ? null : trailingContent;

  return (
    <div ref={setNodeRef} style={style}>
      <ExpandableListItem
        {...props}
        image={props.image ?? undefined}
        imageAlt={props.imageAlt ?? undefined}
        leadingContent={reorderLeadingContent}
        trailingContent={reorderTrailingContent}
      />
    </div>
  );
}
