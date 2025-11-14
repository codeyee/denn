import { useMemo } from "react";
import { ListItem } from "@/types";
import {
  GroupBy,
  SortBy,
  SortOrder,
  PageSize,
  GroupedItems,
} from "@/types/listView";
import {
  groupItems,
  sortItems,
  sortGroupedItems,
  paginateItems,
} from "../utils";

interface UseListGroupingOptions {
  listItems: ListItem[];
  primaryGroup: GroupBy;
  secondaryGroup: GroupBy;
  sortBy: SortBy;
  sortOrder: SortOrder;
  currentPage: number;
  pageSize: PageSize;
  isReorderMode: boolean;
}

interface ProcessedData {
  displayItems: ListItem[];
  groupedItems: GroupedItems<ListItem>[] | null;
  paginationInfo: {
    currentPage: number;
    pageSize: PageSize;
    totalItems: number;
    totalPages: number;
    startIndex: number;
    endIndex: number;
  };
}

export function useListGrouping({
  listItems,
  primaryGroup,
  secondaryGroup,
  sortBy,
  sortOrder,
  currentPage,
  pageSize,
  isReorderMode,
}: UseListGroupingOptions): ProcessedData {
  const processedData = useMemo(() => {
    if (isReorderMode) {
      return {
        displayItems: listItems,
        groupedItems: null,
        paginationInfo: {
          currentPage: 1,
          pageSize: listItems.length as PageSize,
          totalItems: listItems.length,
          totalPages: 1,
          startIndex: 0,
          endIndex: listItems.length,
        },
      };
    }

    const hasGrouping = primaryGroup !== "none";

    if (hasGrouping) {
      let grouped = groupItems(listItems, primaryGroup, secondaryGroup);
      grouped = sortGroupedItems(grouped, sortBy, sortOrder);

      if (secondaryGroup !== "none") {
        const paginated = paginateItems(grouped, currentPage, pageSize);
        return {
          displayItems: [],
          groupedItems: paginated.items,
          paginationInfo: {
            currentPage: paginated.currentPage,
            pageSize: paginated.pageSize,
            totalItems: paginated.totalItems,
            totalPages: paginated.totalPages,
            startIndex: paginated.startIndex,
            endIndex: paginated.endIndex,
          },
        };
      }

      const allItems = grouped.flatMap((g) => g.items);
      const paginated = paginateItems(allItems, currentPage, pageSize);

      const paginatedGrouped = groupItems(
        paginated.items,
        primaryGroup,
        secondaryGroup
      );
      const sortedPaginatedGrouped = sortGroupedItems(
        paginatedGrouped,
        sortBy,
        sortOrder
      );

      return {
        displayItems: [],
        groupedItems: sortedPaginatedGrouped,
        paginationInfo: {
          currentPage: paginated.currentPage,
          pageSize: paginated.pageSize,
          totalItems: paginated.totalItems,
          totalPages: paginated.totalPages,
          startIndex: paginated.startIndex,
          endIndex: paginated.endIndex,
        },
      };
    } else {
      const sorted = sortItems(listItems, sortBy, sortOrder);
      const paginated = paginateItems(sorted, currentPage, pageSize);

      return {
        displayItems: paginated.items,
        groupedItems: null,
        paginationInfo: {
          currentPage: paginated.currentPage,
          pageSize: paginated.pageSize,
          totalItems: paginated.totalItems,
          totalPages: paginated.totalPages,
          startIndex: paginated.startIndex,
          endIndex: paginated.endIndex,
        },
      };
    }
  }, [
    listItems,
    primaryGroup,
    secondaryGroup,
    sortBy,
    sortOrder,
    currentPage,
    pageSize,
    isReorderMode,
  ]);

  return processedData;
}
