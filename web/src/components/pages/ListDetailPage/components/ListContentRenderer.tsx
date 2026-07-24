import { DragOverEvent, DragStartEvent } from "@dnd-kit/core";
import { Package } from "lucide-react";
import { ListItem, UserListDetail } from "@/lib/types";
import { GroupedItems } from "@/lib/types/listView";
import { ListItemSkeleton } from "../../../common/lists/ListItemSkeleton";
import { VerticalList } from "../../../common/lists/VerticalList";
import { FlatListView } from "./ListView/FlatListView";
import { GroupedListView } from "./ListView/GroupedListView";
import { ReorderListView } from "./ListView/ReorderListView";
import { FlatGalleryView } from "./GalleryView/FlatGalleryView";
import { GroupedGalleryView } from "./GalleryView/GroupedGalleryView";

interface ListContentRendererProps {
  totalItemCount: number;
  isReorderMode: boolean;
  isViewerLoading: boolean;
  viewMode: "list" | "gallery";
  displayItems: ListItem[];
  groupedItems: GroupedItems<ListItem>[] | null;
  highlightedItemId: number | null;
  list: UserListDetail;
  currentUserId?: number;
  reorderItems: ListItem[];
  activeId: number | null;
  onToggleStatus: (itemId: number, currentStatus: string) => void;
  onDelete: (itemId: number) => void;
  onRate: (item: ListItem) => void;
  shouldInviteToRate: (item: ListItem) => boolean;
  onDragStart: (event: DragStartEvent) => void;
  onDragOver: (event: DragOverEvent) => void;
  onDragEnd: () => void;
  onDragCancel: () => void;
}

export function ListContentRenderer({
  totalItemCount,
  isReorderMode,
  isViewerLoading,
  viewMode,
  displayItems,
  groupedItems,
  highlightedItemId,
  list,
  currentUserId,
  reorderItems,
  activeId,
  onToggleStatus,
  onDelete,
  onRate,
  shouldInviteToRate,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDragCancel,
}: ListContentRendererProps) {
  if (totalItemCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-white/5 rounded-2xl">
        <Package className="w-16 h-16 text-gray-400 opacity-50 mb-4" />
        <p className="text-gray-400 text-lg">This list is empty</p>
        <p className="text-gray-400 text-sm">Add items to get started</p>
      </div>
    );
  }

  if (isReorderMode) {
    return (
      <ReorderListView
        items={reorderItems}
        activeId={activeId}
        list={list}
        currentUserId={currentUserId}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      />
    );
  }

  if (isViewerLoading) {
    return (
      <VerticalList spacing="md">
        {Array.from({ length: 10 }).map((_, index) => (
          <ListItemSkeleton key={`items-skeleton-${index}`} index={index} />
        ))}
      </VerticalList>
    );
  }

  const itemActionProps = {
    highlightedItemId,
    list,
    currentUserId,
    onToggleStatus,
    onDelete,
    onRate,
    shouldInviteToRate,
  };

  if (viewMode === "list") {
    return groupedItems ? (
      <GroupedListView groups={groupedItems} {...itemActionProps} />
    ) : (
      <FlatListView items={displayItems} {...itemActionProps} />
    );
  }

  return groupedItems ? (
    <GroupedGalleryView groups={groupedItems} {...itemActionProps} />
  ) : (
    <FlatGalleryView items={displayItems} {...itemActionProps} />
  );
}
