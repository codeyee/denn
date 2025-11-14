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
  groupItemsComposite,
  sortItems,
  sortGroupedItems,
  paginateItems,
} from "../utils";

interface UseListGroupingOptions {
  listItems: ListItem[];
  groupBy: GroupBy[];
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
  groupBy,
  sortBy,
  sortOrder,
  currentPage,
  pageSize,
  isReorderMode,
}: UseListGroupingOptions): ProcessedData {
  const processedData = useMemo(() => {
    // In reorder mode, show all items without grouping or pagination
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

    const hasGrouping = groupBy.length > 0;

    if (hasGrouping) {
      // Create composite groups
      let grouped = groupItemsComposite(listItems, groupBy);

      // Sort items within each group
      grouped = sortGroupedItems(grouped, sortBy, sortOrder);

      // Get all items from all groups for pagination
      const allItems = grouped.flatMap((g) => g.items);
      const paginated = paginateItems(allItems, currentPage, pageSize);

      // Re-group the paginated items to maintain group structure
      const paginatedGrouped = groupItemsComposite(paginated.items, groupBy);
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
      // No grouping: sort and paginate items directly
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
  }, [listItems, groupBy, sortBy, sortOrder, currentPage, pageSize, isReorderMode]);

  return processedData;
}
