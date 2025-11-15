import {
  DndContext,
  closestCenter,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  SensorDescriptor,
  SensorOptions,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { ListItem, UserListDetail } from "@/lib/types";
import { ReorderableListItemCard } from "../../../../common/cards/ListItemCard/ReorderableListItemCard";

interface FlatGalleryViewProps {
  items: ListItem[];
  activeId: number | null;
  isReorderMode: boolean;
  list: UserListDetail;
  currentUserId?: number;
  sensors: SensorDescriptor<SensorOptions>[];
  onDragStart: (event: DragStartEvent) => void;
  onDragOver: (event: DragOverEvent) => void;
  onDragEnd: () => void;
  onDragCancel: () => void;
  onToggleStatus: (itemId: number, currentStatus: string) => void;
  onDelete: (itemId: number) => void;
  onRate: (item: ListItem) => void;
  shouldInviteToRate: (item: ListItem) => boolean;
}

export function FlatGalleryView({
  items,
  activeId,
  isReorderMode,
  list,
  currentUserId,
  sensors,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDragCancel,
  onToggleStatus,
  onDelete,
  onRate,
  shouldInviteToRate,
}: FlatGalleryViewProps) {
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
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-6 5xl:grid-cols-7 6xl:grid-cols-8 gap-4">
          {items.map((item) => (
            <ReorderableListItemCard
              key={item.id}
              item={item}
              activeId={activeId}
              list={list}
              currentUserId={currentUserId}
              onToggleStatus={onToggleStatus}
              onDelete={onDelete}
              onRateClick={() => onRate(item)}
              showRatingInvitation={shouldInviteToRate(item)}
              isReorderMode={isReorderMode}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeId && activeItem ? (
          <div className="opacity-80 shadow-2xl pointer-events-none">
            <ReorderableListItemCard
              item={activeItem}
              activeId={null}
              list={list}
              currentUserId={currentUserId}
              onToggleStatus={onToggleStatus}
              onDelete={onDelete}
              onRateClick={() => onRate(activeItem)}
              showRatingInvitation={shouldInviteToRate(activeItem)}
              isReorderMode={true}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
