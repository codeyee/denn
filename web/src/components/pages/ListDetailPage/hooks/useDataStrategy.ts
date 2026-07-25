import { useCallback } from "react";
import {
  ItemStatus,
  ListItem,
  ListStatsResponse,
  ListType,
  ListVisibility,
  PaginationMetadata,
  UserListDetail,
} from "@/lib/types";
import { ListItemQuery } from "@/lib/types/listView";
import { useListData } from "./useListData";

interface UseDataStrategyOptions {
  listId: number;
  query: ListItemQuery;
  country?: string | null;
}

interface UseDataStrategyReturn {
  loading: boolean;
  itemsLoading: boolean;
  fullItemsLoading: boolean;
  error: string | null;
  list: UserListDetail | null;
  pageItems: ListItem[];
  fullItems: ListItem[] | null;
  totalItemCount: number;
  totalPages: number;
  pageMetadata: PaginationMetadata | null;
  stats: ListStatsResponse | null;
  completedCount: number;
  pendingCount: number;
  completionRate: number;
  setCachedItems: React.Dispatch<React.SetStateAction<ListItem[]>>;
  ensureFullItems: () => Promise<ListItem[]>;
  refetchCurrentPage: () => Promise<void>;
  onListUpdated: (
    name: string,
    description?: string,
    listType?: ListType,
    visibility?: ListVisibility,
  ) => void;
  onItemDeleted: (item: ListItem) => void;
  onItemStatusUpdated: (
    itemId: number,
    previousStatus: ItemStatus,
    nextStatus: ItemStatus,
  ) => void;
  onReorderSaved: (items: ListItem[]) => void;
}

export function useDataStrategy({
  listId,
  query,
  country,
}: UseDataStrategyOptions): UseDataStrategyReturn {
  const {
    loading,
    itemsLoading,
    fullItemsLoading,
    error,
    list,
    pageItems,
    fullItems,
    totalItemCount,
    pageMetadata,
    stats,
    setList,
    setPageItems,
    setFullItems,
    setTotalItemCount,
    setStats,
    refetchCurrentPage,
    ensureFullItems,
  } = useListData({ listId, query, country });

  const setCachedItems = useCallback(
    (updater: React.SetStateAction<ListItem[]>) => {
      setPageItems(updater);
      setFullItems((prev) => {
        if (!prev) return prev;
        return typeof updater === "function"
          ? (updater as (items: ListItem[]) => ListItem[])(prev)
          : updater;
      });
    },
    [setFullItems, setPageItems],
  );

  const onListUpdated = useCallback(
    (
      name: string,
      description?: string,
      listType?: ListType,
      visibility?: ListVisibility,
    ) => {
      setList((prev) =>
        prev
          ? {
              ...prev,
              name,
              description: description ?? null,
              list_type: listType ?? prev.list_type,
              visibility: visibility ?? prev.visibility,
            }
          : prev,
      );
    },
    [setList],
  );

  const onItemDeleted = useCallback(
    (item: ListItem) => {
      setTotalItemCount((prev) => Math.max(0, prev - 1));
      setStats((prev) => {
        if (!prev) return prev;
        const nextCompleted =
          item.status === ItemStatus.COMPLETED
            ? Math.max(0, prev.completed_items - 1)
            : prev.completed_items;
        const nextPending =
          item.status === ItemStatus.PENDING
            ? Math.max(0, prev.pending_items - 1)
            : prev.pending_items;
        return {
          ...prev,
          total_items: Math.max(0, prev.total_items - 1),
          completed_items: nextCompleted,
          pending_items: nextPending,
        };
      });
      void refetchCurrentPage();
    },
    [refetchCurrentPage, setStats, setTotalItemCount],
  );

  const onItemStatusUpdated = useCallback(
    (_itemId: number, previousStatus: ItemStatus, nextStatus: ItemStatus) => {
      setStats((prev) => {
        if (!prev || previousStatus === nextStatus) return prev;
        const completedDelta = nextStatus === ItemStatus.COMPLETED ? 1 : -1;
        const pendingDelta = nextStatus === ItemStatus.PENDING ? 1 : -1;
        return {
          ...prev,
          completed_items: Math.max(0, prev.completed_items + completedDelta),
          pending_items: Math.max(0, prev.pending_items + pendingDelta),
        };
      });
    },
    [setStats],
  );

  const onReorderSaved = useCallback(
    (items: ListItem[]) => {
      setFullItems(items);
      const pageStart = (query.page - 1) * query.pageSize;
      const pageEnd = pageStart + query.pageSize;
      setPageItems(items.slice(pageStart, pageEnd));
    },
    [query.page, query.pageSize, setFullItems, setPageItems],
  );

  const totalPages = pageMetadata?.total_pages
    ?? Math.max(1, Math.ceil(totalItemCount / query.pageSize));
  const completedCount = stats?.completed_items ?? 0;
  const pendingCount = stats?.pending_items ?? 0;
  const completionRate =
    totalItemCount > 0 ? Math.round((completedCount / totalItemCount) * 100) : 0;

  return {
    loading,
    itemsLoading,
    fullItemsLoading,
    error,
    list,
    pageItems,
    fullItems,
    totalItemCount,
    totalPages,
    pageMetadata,
    stats,
    completedCount,
    pendingCount,
    completionRate,
    setCachedItems,
    ensureFullItems,
    refetchCurrentPage,
    onListUpdated,
    onItemDeleted,
    onItemStatusUpdated,
    onReorderSaved,
  };
}
