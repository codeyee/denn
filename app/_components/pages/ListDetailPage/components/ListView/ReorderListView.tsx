import {
  DndContext,
  closestCenter,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ListItem, UserListDetail } from "@/lib/types";
import { VerticalList } from "../../../../common/lists/VerticalList";
import { ListItemRenderer } from "../ListItemRenderer";

interface ReorderListViewProps {
  items: ListItem[];
  activeId: number | null;
  list: UserListDetail;
  currentUserId?: number;
  onDragStart: (event: DragStartEvent) => void;
  onDragOver: (event: DragOverEvent) => void;
  onDragEnd: () => void;
  onDragCancel: () => void;
}

export function ReorderListView({
  items,
  activeId,
  list,
  currentUserId,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDragCancel,
}: ReorderListViewProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const activeItem = items.find((item) => item.id === activeId) ?? null;

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
              isHighlighted={false}
              isReorderMode={true}
              list={list}
              currentUserId={currentUserId}
              onToggleStatus={() => undefined}
              onDelete={() => undefined}
              onRate={() => undefined}
              shouldInviteToRate={() => false}
            />
          ))}
        </VerticalList>
      </SortableContext>

      <DragOverlay>
        {activeItem ? (
          <div className="opacity-80 shadow-2xl pointer-events-none">
            <ListItemRenderer
              item={activeItem}
              activeId={null}
              isHighlighted={false}
              isReorderMode={true}
              list={list}
              currentUserId={currentUserId}
              onToggleStatus={() => undefined}
              onDelete={() => undefined}
              onRate={() => undefined}
              shouldInviteToRate={() => false}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
