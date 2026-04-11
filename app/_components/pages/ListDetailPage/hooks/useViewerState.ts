import { useState, useEffect } from "react";
import { ListItem } from "@/lib/types";
import {
  GroupBy,
  SortBy,
  SortOrder,
  PageSize,
  GroupedItems,
} from "@/lib/types/listView";
import { useListGrouping } from "./useListGrouping";

interface UseViewerStateOptions {
  pageItems: ListItem[];
  groupBy: GroupBy[];
  sortBy: SortBy;
  sortOrder: SortOrder;
  pageSize: PageSize;
  isReorderMode: boolean;
}

interface UseViewerStateReturn {
  viewMode: "list" | "gallery";
  setViewMode: (mode: "list" | "gallery") => void;
  highlightedItemId: number | null;
  setHighlightedItemId: (id: number | null) => void;
  displayItems: ListItem[];
  groupedItems: GroupedItems<ListItem>[] | null;
  isViewerLoading: boolean;
}

export function useViewerState({
  pageItems,
  groupBy,
  sortBy,
  sortOrder,
  pageSize,
  isReorderMode,
}: UseViewerStateOptions): UseViewerStateReturn {
  const [viewMode, setViewMode] = useState<"list" | "gallery">("list");
  const [highlightedItemId, setHighlightedItemId] = useState<number | null>(null);

  const processedData = useListGrouping({
    listItems: pageItems,
    groupBy,
    sortBy,
    sortOrder,
    currentPage: 1,
    pageSize,
    isReorderMode: false,
  });

  useEffect(() => {
    if (!highlightedItemId || isReorderMode) return;

    const scrollTimer = window.setTimeout(() => {
      const target = document.querySelector<HTMLElement>(
        `[data-list-item-id="${highlightedItemId}"]`,
      );
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);

    const clearTimer = window.setTimeout(() => {
      setHighlightedItemId(null);
    }, 3000);

    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [highlightedItemId, isReorderMode, viewMode]);

  return {
    viewMode,
    setViewMode,
    highlightedItemId,
    setHighlightedItemId,
    displayItems: processedData.displayItems,
    groupedItems: processedData.groupedItems,
    isViewerLoading: false,
  };
}
