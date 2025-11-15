import { useState, useEffect, useCallback } from "react";
import {
  GroupBy,
  SortBy,
  SortOrder,
  PageSize,
  DEFAULT_LIST_VIEW_PREFERENCES,
  MAX_GROUPING_ATTRIBUTES,
} from "@/types/listView";
import { loadPreferences, savePreferences } from "../utils";

interface UseListPreferencesReturn {
  groupBy: GroupBy[];
  sortBy: SortBy;
  sortOrder: SortOrder;
  pageSize: PageSize;
  currentPage: number;
  setGroupBy: (groupBy: GroupBy[]) => void;
  addGroupBy: (group: GroupBy) => void;
  removeGroupBy: (index: number) => void;
  clearGroupBy: () => void;
  setSortBy: (sortBy: SortBy) => void;
  setSortOrder: (order: SortOrder) => void;
  setPageSize: (size: PageSize) => void;
  setCurrentPage: (page: number) => void;
}

interface LegacyPreferences {
  primaryGroup?: string;
  secondaryGroup?: string;
  sortBy: SortBy;
  sortOrder: SortOrder;
  pageSize: PageSize;
  currentPage: number;
}

export function useListPreferences(listId: number): UseListPreferencesReturn {
  const [groupBy, setGroupBy] = useState<GroupBy[]>(
    DEFAULT_LIST_VIEW_PREFERENCES.groupBy
  );
  const [sortBy, setSortBy] = useState<SortBy>(
    DEFAULT_LIST_VIEW_PREFERENCES.sortBy
  );
  const [sortOrder, setSortOrder] = useState<SortOrder>(
    DEFAULT_LIST_VIEW_PREFERENCES.sortOrder
  );
  const [pageSize, setPageSize] = useState<PageSize>(
    DEFAULT_LIST_VIEW_PREFERENCES.pageSize
  );
  const [currentPage, setCurrentPage] = useState<number>(
    DEFAULT_LIST_VIEW_PREFERENCES.currentPage
  );

  // Load preferences on mount or when listId changes
  useEffect(() => {
    const preferences = loadPreferences(listId);

    let computedGroupBy: GroupBy[];

    if ('primaryGroup' in preferences && 'secondaryGroup' in preferences) {
      const legacy = preferences as LegacyPreferences;
      const groupByArray: GroupBy[] = [];

      if (legacy.primaryGroup && legacy.primaryGroup !== 'none') {
        groupByArray.push(legacy.primaryGroup as GroupBy);
      }
      if (legacy.secondaryGroup && legacy.secondaryGroup !== 'none') {
        groupByArray.push(legacy.secondaryGroup as GroupBy);
      }

      computedGroupBy = groupByArray;
    } else {
      computedGroupBy = preferences.groupBy || [];
    }

    setGroupBy(computedGroupBy);
    setSortBy(preferences.sortBy);
    setSortOrder(preferences.sortOrder);
    setCurrentPage(preferences.currentPage);
    setPageSize(preferences.pageSize);
  }, [listId]);

  // Save preferences whenever they change
  useEffect(() => {
    savePreferences(listId, {
      groupBy,
      sortBy,
      sortOrder,
      currentPage,
      pageSize,
    });
  }, [listId, groupBy, sortBy, sortOrder, currentPage, pageSize]);

  // Add a grouping attribute
  const addGroupBy = useCallback((group: GroupBy) => {
    setGroupBy((prev) => {
      // Don't add if already present or at max limit
      if (prev.includes(group) || prev.length >= MAX_GROUPING_ATTRIBUTES) {
        return prev;
      }
      // Don't add 'none'
      if (group === 'none') {
        return prev;
      }
      return [...prev, group];
    });
  }, []);

  // Remove a grouping attribute by index
  const removeGroupBy = useCallback((index: number) => {
    setGroupBy((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Clear all grouping
  const clearGroupBy = useCallback(() => {
    setGroupBy([]);
  }, []);

  return {
    groupBy,
    sortBy,
    sortOrder,
    pageSize,
    currentPage,
    setGroupBy,
    addGroupBy,
    removeGroupBy,
    clearGroupBy,
    setSortBy,
    setSortOrder,
    setPageSize,
    setCurrentPage,
  };
}
