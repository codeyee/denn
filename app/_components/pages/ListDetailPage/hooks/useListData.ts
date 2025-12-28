import { useState, useEffect, useCallback, useRef } from "react";
import { listActions, listItemActions } from "@/lib/api";
import { UserListDetail, PaginatedListItemList } from "@/lib/types";
import { ListItem } from "@/lib/types";

const INITIAL_ITEMS_SIZE = 50;
const BACKGROUND_PAGE_SIZE = 100;

interface UseListDataReturn {
  loading: boolean;
  itemsLoading: boolean;
  allItemsLoaded: boolean;
  error: string | null;
  list: UserListDetail | null;
  listItems: ListItem[];
  totalItemCount: number;
  setListItems: React.Dispatch<React.SetStateAction<ListItem[]>>;
  refetch: () => Promise<void>;
  loadAllItems: () => Promise<void>;
}

export function useListData(listId: number): UseListDataReturn {
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [allItemsLoaded, setAllItemsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [list, setList] = useState<UserListDetail | null>(null);
  const [listItems, setListItems] = useState<ListItem[]>([]);
  const [totalItemCount, setTotalItemCount] = useState(0);

  const loadingAllRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchItemsPage = useCallback(
    async (page: number, pageSize: number): Promise<PaginatedListItemList> => {
      return listItemActions.list(listId, page, pageSize, undefined, "content_item");
    },
    [listId]
  );

  const fetchListWithInitialItems = useCallback(async () => {
    try {
      const listData = await listActions.get(listId, {
        expand: "owner,members,items.content_item",
        items_size: INITIAL_ITEMS_SIZE,
      });

      setList({ ...listData, items: [] });

      const initialItems = (listData.items || []) as ListItem[];
      setListItems(initialItems);

      const totalCount = parseInt(listData.item_count || "0", 10);
      setTotalItemCount(totalCount);

      if (initialItems.length >= totalCount) {
        setAllItemsLoaded(true);
      }

      return listData;
    } catch (err) {
      console.error("Error fetching list:", err);
      throw err;
    }
  }, [listId]);

  const loadAllItems = useCallback(async () => {
    if (loadingAllRef.current || allItemsLoaded) return;

    loadingAllRef.current = true;
    setItemsLoading(true);

    abortControllerRef.current = new AbortController();

    try {
      const firstPage = await fetchItemsPage(1, BACKGROUND_PAGE_SIZE);
      const totalCount = firstPage.metadata.count;
      const totalPages = firstPage.metadata.total_pages;

      setTotalItemCount(totalCount);

      if (abortControllerRef.current?.signal.aborted) return;

      let allItems = [...firstPage.results];

      for (let page = 2; page <= totalPages; page++) {
        if (abortControllerRef.current?.signal.aborted) return;

        const pageData = await fetchItemsPage(page, BACKGROUND_PAGE_SIZE);
        allItems = [...allItems, ...pageData.results];
      }

      if (!abortControllerRef.current?.signal.aborted) {
        setListItems(allItems);
        setAllItemsLoaded(true);
      }
    } catch (err) {
      if (!abortControllerRef.current?.signal.aborted) {
        console.error("Error loading all items:", err);
      }
    } finally {
      loadingAllRef.current = false;
      setItemsLoading(false);
    }
  }, [fetchItemsPage, allItemsLoaded]);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setAllItemsLoaded(false);

      await fetchListWithInitialItems();
    } catch (err) {
      console.error("Error fetching list:", err);
      setError(err instanceof Error ? err.message : "Failed to load list");
    } finally {
      setLoading(false);
    }
  }, [fetchListWithInitialItems]);

  useEffect(() => {
    fetchList();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchList]);

  useEffect(() => {
    if (!loading && list && !allItemsLoaded) {
      const timer = setTimeout(() => {
        loadAllItems();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [loading, list, allItemsLoaded, loadAllItems]);

  return {
    loading,
    itemsLoading,
    allItemsLoaded,
    error,
    list,
    listItems,
    totalItemCount,
    setListItems,
    refetch: fetchList,
    loadAllItems,
  };
}
