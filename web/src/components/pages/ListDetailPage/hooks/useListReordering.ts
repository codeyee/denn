import { useState, useCallback } from "react";
import { DragOverEvent, DragStartEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useUIStore } from "@/stores/ui-store";
import { useReorderListItemsMutation } from "@/lib/api/mutations";
import { ListItem } from "@/lib/types";

interface UseListReorderingOptions {
  listId: number;
  fullItems: ListItem[] | null;
  ensureFullItems: () => Promise<ListItem[]>;
  onReorderSaved: (items: ListItem[]) => void;
}

interface UseListReorderingReturn {
  activeId: number | null;
  reorderItems: ListItem[];
  reorderLoading: boolean;
  reorderPreparing: boolean;
  isReorderMode: boolean;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragOver: (event: DragOverEvent) => void;
  handleDragEnd: () => void;
  handleDragCancel: () => void;
  handleEnterReorderMode: () => Promise<void>;
  handleCancelReorder: () => void;
  handleSaveReorder: () => Promise<void>;
}

export function useListReordering({
  listId,
  fullItems,
  ensureFullItems,
  onReorderSaved,
}: UseListReorderingOptions): UseListReorderingReturn {
  const [originalItems, setOriginalItems] = useState<ListItem[]>([]);
  const [reorderItems, setReorderItems] = useState<ListItem[]>([]);
  const [reorderPreparing, setReorderPreparing] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);

  const { isReorderMode, enterReorderMode, exitReorderMode } = useUIStore();

  // T7: persist reorder via TanStack Query mutation. The optimistic
  // ordering already lives in `reorderItems` (driven by drag); on
  // error we restore from `originalItems` and surface a toast.
  const reorderMutation = useReorderListItemsMutation<ListItem[]>({
    onMutate: () => originalItems,
    onError: (_err, _vars, snapshot) => {
      if (snapshot) {
        setReorderItems(snapshot);
      }
    },
  });

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    setReorderItems((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      const nextItems = arrayMove(items, oldIndex, newIndex);

      return nextItems.map((item, index) => ({
        ...item,
        list_order: index + 1,
      }));
    });
  }, []);

  const handleDragEnd = useCallback(() => {
    setActiveId(null);
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setReorderItems(originalItems);
  }, [originalItems]);

  const handleEnterReorderMode = useCallback(async () => {
    setReorderPreparing(true);

    try {
      const items = fullItems ?? (await ensureFullItems());
      setOriginalItems(items);
      setReorderItems(items);
      enterReorderMode(listId);
    } finally {
      setReorderPreparing(false);
    }
  }, [ensureFullItems, enterReorderMode, fullItems, listId]);

  const handleCancelReorder = useCallback(() => {
    setActiveId(null);
    setReorderItems([]);
    setOriginalItems([]);
    exitReorderMode();
  }, [exitReorderMode]);

  const handleSaveReorder = useCallback(async () => {
    const itemIds = reorderItems.map((item) => item.id);
    try {
      await reorderMutation.mutateAsync({ listId, itemIds });
      onReorderSaved(reorderItems);
      setOriginalItems(reorderItems);
      setReorderItems([]);
      exitReorderMode();
    } catch {
      // toast + rollback already handled by the mutation
    }
  }, [exitReorderMode, listId, onReorderSaved, reorderItems, reorderMutation]);

  return {
    activeId,
    reorderItems,
    reorderLoading: reorderMutation.isPending,
    reorderPreparing,
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
