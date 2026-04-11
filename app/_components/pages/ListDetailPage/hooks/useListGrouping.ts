import { useMemo } from "react";
import { ListItem } from "@/lib/types";
import {
  GroupBy,
  SortBy,
  SortOrder,
  PageSize,
  GroupedItems,
} from "@/lib/types/listView";
import {
  groupItemsComposite,
  sortItems,
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
    const sortedItems = sortItems(listItems, sortBy, sortOrder);
    const paginated = paginateItems(sortedItems, currentPage, pageSize);

    if (hasGrouping) {
      return {
        displayItems: [],
        groupedItems: groupItemsComposite(paginated.items, groupBy),
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
