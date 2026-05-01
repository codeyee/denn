import { useQuery } from "@tanstack/react-query";

import { listActions } from "@/lib/api";
import type { BulkCheckItem } from "@/lib/types";
import { queryKeys } from "./keys";

interface UseBulkListMembershipQueryOptions {
  enabled?: boolean;
}

export function useBulkListMembershipQuery(
  items: BulkCheckItem[],
  { enabled = true }: UseBulkListMembershipQueryOptions = {},
) {
  return useQuery({
    queryKey: queryKeys.lists.bulkCheck(items),
    queryFn: () => listActions.bulkCheck(items),
    enabled: enabled && items.length > 0,
    staleTime: 30_000,
  });
}
