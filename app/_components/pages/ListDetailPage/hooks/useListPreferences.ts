import { useState, useEffect } from "react";
import {
  GroupBy,
  SortBy,
  SortOrder,
  PageSize,
  DEFAULT_LIST_VIEW_PREFERENCES,
} from "@/types/listView";
import { loadPreferences, savePreferences } from "../utils";

interface UseListPreferencesReturn {
  primaryGroup: GroupBy;
  secondaryGroup: GroupBy;
  sortBy: SortBy;
  sortOrder: SortOrder;
  pageSize: PageSize;
  currentPage: number;
  setPrimaryGroup: (group: GroupBy) => void;
  setSecondaryGroup: (group: GroupBy) => void;
  setSortBy: (sortBy: SortBy) => void;
  setSortOrder: (order: SortOrder) => void;
  setPageSize: (size: PageSize) => void;
  setCurrentPage: (page: number) => void;
}

export function useListPreferences(listId: number): UseListPreferencesReturn {
  const [primaryGroup, setPrimaryGroup] = useState<GroupBy>(
    DEFAULT_LIST_VIEW_PREFERENCES.primaryGroup
  );
  const [secondaryGroup, setSecondaryGroup] = useState<GroupBy>(
    DEFAULT_LIST_VIEW_PREFERENCES.secondaryGroup
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

  useEffect(() => {
    const preferences = loadPreferences(listId);
    setPrimaryGroup(preferences.primaryGroup);
    setSecondaryGroup(preferences.secondaryGroup);
    setSortBy(preferences.sortBy);
    setSortOrder(preferences.sortOrder);
    setCurrentPage(preferences.currentPage);
    setPageSize(preferences.pageSize);
  }, [listId]);

  useEffect(() => {
    savePreferences(listId, {
      primaryGroup,
      secondaryGroup,
      sortBy,
      sortOrder,
      currentPage,
      pageSize,
    });
  }, [listId, primaryGroup, secondaryGroup, sortBy, sortOrder, currentPage, pageSize]);

  return {
    primaryGroup,
    secondaryGroup,
    sortBy,
    sortOrder,
    pageSize,
    currentPage,
    setPrimaryGroup,
    setSecondaryGroup,
    setSortBy,
    setSortOrder,
    setPageSize,
    setCurrentPage,
  };
}
