import { useState, useEffect, useCallback } from "react";
import { listActions } from "@/lib/api";
import { UserListDetail } from "@/lib/api/types";
import { ListItem } from "@/types";

interface UseListDataReturn {
  loading: boolean;
  error: string | null;
  list: UserListDetail | null;
  listItems: ListItem[];
  setListItems: React.Dispatch<React.SetStateAction<ListItem[]>>;
  refetch: () => Promise<void>;
}

export function useListData(listId: number): UseListDataReturn {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [list, setList] = useState<UserListDetail | null>(null);
  const [listItems, setListItems] = useState<ListItem[]>([]);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const listData = await listActions.get(listId);
      setList(listData);
      setListItems(listData.items as ListItem[]);
    } catch (err) {
      console.error("Error fetching list:", err);
      setError(err instanceof Error ? err.message : "Failed to load list");
    } finally {
      setLoading(false);
    }
  }, [listId]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  return {
    loading,
    error,
    list,
    listItems,
    setListItems,
    refetch: fetchList,
  };
}
