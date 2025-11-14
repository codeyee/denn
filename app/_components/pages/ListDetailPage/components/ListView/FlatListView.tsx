import {
  DndContext,
  closestCenter,
  DragOverlay,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ListItem } from "@/types";
import { VerticalList } from "../../../../common/lists/VerticalList";
import { ListItemRenderer } from "../ListItemRenderer";

interface FlatListViewProps {
  items: ListItem[];
  activeId: number | null;
  isReorderMode: boolean;
  sensors: any;
  onDragStart: (event: any) => void;
  onDragOver: (event: any) => void;
  onDragEnd: () => void;
  onDragCancel: () => void;
  onToggleStatus: (itemId: number, currentStatus: string) => void;
  onDelete: (itemId: number) => void;
  onRate: (item: ListItem) => void;
  shouldInviteToRate: (item: ListItem) => boolean;
}

export function FlatListView({
  items,
  activeId,
  isReorderMode,
  sensors,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDragCancel,
  onToggleStatus,
  onDelete,
  onRate,
  shouldInviteToRate,
}: FlatListViewProps) {
  const activeItem = items.find((i) => i.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <SortableContext
        items={items.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <VerticalList spacing="md">
          {items.map((item) => (
            <ListItemRenderer
              key={item.id}
              item={item}
              activeId={activeId}
              isReorderMode={isReorderMode}
              onToggleStatus={onToggleStatus}
              onDelete={onDelete}
              onRate={onRate}
              shouldInviteToRate={shouldInviteToRate}
            />
          ))}
        </VerticalList>
      </SortableContext>
      <DragOverlay>
        {activeId && activeItem ? (
          <div className="opacity-80 shadow-2xl pointer-events-none">
            <ListItemRenderer
              item={activeItem}
              activeId={null}
              isReorderMode={true}
              onToggleStatus={onToggleStatus}
              onDelete={onDelete}
              onRate={onRate}
              shouldInviteToRate={shouldInviteToRate}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
