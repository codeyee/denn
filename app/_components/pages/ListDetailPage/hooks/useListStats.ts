import { useMemo } from "react";
import { ItemStatus } from "@/lib/api/types";
import { ListItem } from "@/types";

interface UseListStatsReturn {
  itemCount: number;
  completedCount: number;
  pendingCount: number;
  completionRate: number;
}

export function useListStats(listItems: ListItem[]): UseListStatsReturn {
  const stats = useMemo(() => {
    const itemCount = listItems.length;
    const completedCount = listItems.filter(
      (item) => item.status === ItemStatus.COMPLETED
    ).length;
    const pendingCount = listItems.filter(
      (item) => item.status === ItemStatus.PENDING
    ).length;
    const completionRate =
      itemCount > 0 ? Math.round((completedCount / itemCount) * 100) : 0;

    return {
      itemCount,
      completedCount,
      pendingCount,
      completionRate,
    };
  }, [listItems]);

  return stats;
}
