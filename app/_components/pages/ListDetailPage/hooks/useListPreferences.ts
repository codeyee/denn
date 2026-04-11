import { useState, useEffect, useCallback } from "react";
import {
  GroupBy,
  SortBy,
  SortOrder,
  PageSize,
  ListViewPreferences,
  MAX_GROUPING_ATTRIBUTES,
} from "@/lib/types/listView";
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
  pageSize: PageSize | "all";
  currentPage: number;
}

function normalizePageSize(pageSize: PageSize | "all"): PageSize {
  return pageSize === "all" ? 50 : pageSize;
}

function computeGroupByFromPreferences(preferences: LegacyPreferences | ListViewPreferences): GroupBy[] {
  if ('primaryGroup' in preferences && 'secondaryGroup' in preferences) {
    const legacy = preferences as LegacyPreferences;
    const groupByArray: GroupBy[] = [];

    if (legacy.primaryGroup && legacy.primaryGroup !== 'none') {
      groupByArray.push(legacy.primaryGroup as GroupBy);
    }
    if (legacy.secondaryGroup && legacy.secondaryGroup !== 'none') {
      groupByArray.push(legacy.secondaryGroup as GroupBy);
    }

    return groupByArray;
  }
  return (preferences as ListViewPreferences).groupBy || [];
}

function getInitialPreferences(listId: number) {
  const preferences = loadPreferences(listId);

  return {
    groupBy: computeGroupByFromPreferences(preferences),
    sortBy: preferences.sortBy,
    sortOrder: preferences.sortOrder,
    pageSize: normalizePageSize(preferences.pageSize),
    currentPage: preferences.currentPage,
  };
}

export function useListPreferences(listId: number): UseListPreferencesReturn {
  const [preferences, setPreferences] = useState(() => getInitialPreferences(listId));
  const [currentListId, setCurrentListId] = useState(listId);

  // Adjust state during render when listId changes
  if (listId !== currentListId) {
    const newPreferences = loadPreferences(listId);
    const computedGroupBy = computeGroupByFromPreferences(newPreferences);

    setPreferences({
      groupBy: computedGroupBy,
      sortBy: newPreferences.sortBy,
      sortOrder: newPreferences.sortOrder,
      currentPage: newPreferences.currentPage,
      pageSize: normalizePageSize(newPreferences.pageSize),
    });
    setCurrentListId(listId);
  }

  // Save preferences whenever they change
  useEffect(() => {
    savePreferences(listId, preferences);
  }, [listId, preferences]);

  // Wrapper setters that update the preferences object
  const setGroupBy = useCallback((groupBy: GroupBy[]) => {
    setPreferences((prev) => ({ ...prev, groupBy }));
  }, []);

  const setSortBy = useCallback((sortBy: SortBy) => {
    setPreferences((prev) => ({ ...prev, sortBy }));
  }, []);

  const setSortOrder = useCallback((sortOrder: SortOrder) => {
    setPreferences((prev) => ({ ...prev, sortOrder }));
  }, []);

  const setPageSize = useCallback((pageSize: PageSize) => {
    setPreferences((prev) => ({ ...prev, pageSize }));
  }, []);

  const setCurrentPage = useCallback((currentPage: number) => {
    setPreferences((prev) => ({ ...prev, currentPage }));
  }, []);

  // Add a grouping attribute
  const addGroupBy = useCallback((group: GroupBy) => {
    setPreferences((prev) => {
      const currentGroupBy = prev.groupBy;
      // Don't add if already present or at max limit
      if (currentGroupBy.includes(group) || currentGroupBy.length >= MAX_GROUPING_ATTRIBUTES) {
        return prev;
      }
      // Don't add 'none'
      if (group === 'none') {
        return prev;
      }
      return { ...prev, groupBy: [...currentGroupBy, group] };
    });
  }, []);

  // Remove a grouping attribute by index
  const removeGroupBy = useCallback((index: number) => {
    setPreferences((prev) => ({
      ...prev,
      groupBy: prev.groupBy.filter((_, i) => i !== index),
    }));
  }, []);

  // Clear all grouping
  const clearGroupBy = useCallback(() => {
    setPreferences((prev) => ({ ...prev, groupBy: [] }));
  }, []);

  return {
    groupBy: preferences.groupBy,
    sortBy: preferences.sortBy,
    sortOrder: preferences.sortOrder,
    pageSize: preferences.pageSize,
    currentPage: preferences.currentPage,
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
