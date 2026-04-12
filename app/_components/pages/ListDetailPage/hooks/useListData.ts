import { useState, useEffect, useCallback, useRef } from "react";
import { listActions, listItemActions } from "@/lib/api";
import { ListItem, ListStatsResponse, UserListDetail } from "@/lib/types";
import { PageSize } from "@/lib/types/listView";

const VIEWER_SOURCE_FIELDS = "title,original_title,tv_show_name,image_url,authors";

interface UseListDataOptions {
  listId: number;
  currentPage: number;
  pageSize: PageSize;
}

interface UseListDataReturn {
  loading: boolean;
  itemsLoading: boolean;
  fullItemsLoading: boolean;
  error: string | null;
  list: UserListDetail | null;
  pageItems: ListItem[];
  fullItems: ListItem[] | null;
  totalItemCount: number;
  stats: ListStatsResponse | null;
  setList: React.Dispatch<React.SetStateAction<UserListDetail | null>>;
  setPageItems: React.Dispatch<React.SetStateAction<ListItem[]>>;
  setFullItems: React.Dispatch<React.SetStateAction<ListItem[] | null>>;
  setTotalItemCount: React.Dispatch<React.SetStateAction<number>>;
  setStats: React.Dispatch<React.SetStateAction<ListStatsResponse | null>>;
  refetchMetadata: () => Promise<void>;
  refetchCurrentPage: () => Promise<void>;
  refetchStats: () => Promise<void>;
  ensureFullItems: () => Promise<ListItem[]>;
}

async function fetchListMetadata(listId: number): Promise<UserListDetail> {
  return listActions.get(listId, {
    expand: "owner,members",
    omit: "items",
  });
}

async function fetchListStats(listId: number): Promise<ListStatsResponse> {
  return listActions.getStats(listId);
}

async function fetchListPage(
  listId: number,
  currentPage: number,
  pageSize: PageSize
) {
  return listItemActions.list(listId, currentPage, pageSize, {
    expand: "content_item",
    source_fields: VIEWER_SOURCE_FIELDS,
  });
}

async function fetchAllListItems(listId: number): Promise<ListItem[]> {
  return listItemActions.listAll(listId, {
    expand: "content_item",
    source_fields: VIEWER_SOURCE_FIELDS,
  });
}

export function useListData({
  listId,
  currentPage,
  pageSize,
}: UseListDataOptions): UseListDataReturn {
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [fullItemsLoading, setFullItemsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [list, setList] = useState<UserListDetail | null>(null);
  const [pageItems, setPageItems] = useState<ListItem[]>([]);
  const [fullItems, setFullItems] = useState<ListItem[] | null>(null);
  const [stats, setStats] = useState<ListStatsResponse | null>(null);
  const [totalItemCount, setTotalItemCount] = useState(0);
  const hasBootstrappedPageRef = useRef(false);
  const lastRequestedPageRef = useRef("");
  const currentPageRef = useRef(currentPage);
  const pageSizeRef = useRef(pageSize);

  currentPageRef.current = currentPage;
  pageSizeRef.current = pageSize;

  const refetchMetadata = useCallback(async () => {
    const metadata = await fetchListMetadata(listId);
    setList(metadata);
  }, [listId]);

  const refetchStats = useCallback(async () => {
    const nextStats = await fetchListStats(listId);
    setStats(nextStats);
    setTotalItemCount(nextStats.total_items);
  }, [listId]);

  const refetchCurrentPage = useCallback(async () => {
    setItemsLoading(true);

    try {
      const response = await fetchListPage(listId, currentPage, pageSize);
      setPageItems(response.results);
      setTotalItemCount(response.metadata.count);
      lastRequestedPageRef.current = `${currentPage}:${pageSize}`;
    } finally {
      setItemsLoading(false);
    }
  }, [currentPage, listId, pageSize]);

  const ensureFullItems = useCallback(async () => {
    if (fullItems) {
      return fullItems;
    }

    setFullItemsLoading(true);

    try {
      const items = await fetchAllListItems(listId);
      setFullItems(items);
      setTotalItemCount(items.length);
      return items;
    } finally {
      setFullItemsLoading(false);
    }
  }, [fullItems, listId]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoading(true);
      setError(null);
      setFullItems(null);
      setPageItems([]);
      hasBootstrappedPageRef.current = false;

      try {
        const [metadata, nextStats, response] = await Promise.all([
          fetchListMetadata(listId),
          fetchListStats(listId),
          fetchListPage(listId, currentPageRef.current, pageSizeRef.current),
        ]);

        if (cancelled) {
          return;
        }

        setList(metadata);
        setStats(nextStats);
        setPageItems(response.results);
        setTotalItemCount(nextStats.total_items);
        hasBootstrappedPageRef.current = true;
        lastRequestedPageRef.current = `${currentPageRef.current}:${pageSizeRef.current}`;
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load list");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [listId]);

  useEffect(() => {
    if (
      loading ||
      !hasBootstrappedPageRef.current ||
      lastRequestedPageRef.current === `${currentPage}:${pageSize}`
    ) {
      return;
    }

    void refetchCurrentPage();
  }, [currentPage, loading, pageSize, refetchCurrentPage]);

  return {
    loading,
    itemsLoading,
    fullItemsLoading,
    error,
    list,
    pageItems,
    fullItems,
    totalItemCount,
    stats,
    setList,
    setPageItems,
    setFullItems,
    setTotalItemCount,
    setStats,
    refetchMetadata,
    refetchCurrentPage,
    refetchStats,
    ensureFullItems,
  };
}
