import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useListsStore } from "@/app/_stores/lists-store";
import { useUIStore } from "@/app/_stores/ui-store";
import { ListItem } from "@/types";

interface UseListReorderingOptions {
  listId: number;
  listItems: ListItem[];
  setListItems: React.Dispatch<React.SetStateAction<ListItem[]>>;
}

interface UseListReorderingReturn {
  activeId: number | null;
  reorderLoading: boolean;
  sensors: ReturnType<typeof useSensors>;
  isReorderMode: boolean;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragOver: (event: DragOverEvent) => void;
  handleDragEnd: () => void;
  handleDragCancel: () => void;
  handleEnterReorderMode: () => void;
  handleCancelReorder: () => void;
  handleSaveReorder: () => Promise<void>;
}

export function useListReordering({
  listId,
  listItems,
  setListItems,
}: UseListReorderingOptions): UseListReorderingReturn {
  const [originalItems, setOriginalItems] = useState<ListItem[]>([]);
  const [reorderLoading, setReorderLoading] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);

  const { reorderListItems } = useListsStore();
  const { isReorderMode, enterReorderMode, exitReorderMode } = useUIStore();

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

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setListItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);

        return newItems.map((item, index) => ({
          ...item,
          list_order: index + 1,
        }));
      });
    }
  }, [setListItems]);

  const handleDragEnd = useCallback(() => {
    setActiveId(null);
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    if (isReorderMode && originalItems.length > 0) {
      setListItems([...originalItems]);
    }
  }, [isReorderMode, originalItems, setListItems]);

  const handleEnterReorderMode = useCallback(() => {
    setOriginalItems([...listItems]);
    enterReorderMode(listId);
  }, [listItems, listId, enterReorderMode]);

  const handleCancelReorder = useCallback(() => {
    setListItems([...originalItems]);
    exitReorderMode();
  }, [originalItems, exitReorderMode, setListItems]);

  const handleSaveReorder = useCallback(async () => {
    try {
      setReorderLoading(true);
      const itemIds = listItems.map((item) => item.id);
      await reorderListItems(listId, itemIds);
      exitReorderMode();
      setOriginalItems([]);
    } catch (err) {
      console.error("Failed to save reorder:", err);
      throw err;
    } finally {
      setReorderLoading(false);
    }
  }, [listItems, listId, reorderListItems, exitReorderMode]);

  return {
    activeId,
    reorderLoading,
    sensors,
    isReorderMode,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
    handleEnterReorderMode,
    handleCancelReorder,
    handleSaveReorder,
  };
}
