"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ExpandableListItem } from "./ExpandableListItem";
import { ReactNode } from "react";

interface ReorderableListItemProps {
  id: number;
  activeId: number | null;
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
  activeId,
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
  } = useSortable({
    id: id,
    disabled: !isReorderMode,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 200ms ease",
  };

  // In reorder mode, hide trailing content and make entire item draggable
  const reorderTrailingContent = isReorderMode ? null : trailingContent;

  const isDragging = activeId === id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isReorderMode ? { ...attributes, ...listeners } : {})}
      className={`${isReorderMode && !isDragging ? "cursor-grab animate-reorder-wiggle" : ""} ${isDragging ? "cursor-grabbing opacity-0" : ""}`}
    >
      <ExpandableListItem
        {...props}
        image={props.image ?? undefined}
        imageAlt={props.imageAlt ?? undefined}
        leadingContent={leadingContent}
        trailingContent={reorderTrailingContent}
        // Disable expand functionality in reorder mode
        expandedContent={isReorderMode ? undefined : props.expandedContent}
      />
    </div>
  );
}
