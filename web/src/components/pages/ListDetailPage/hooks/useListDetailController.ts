import { useCallback, useEffect, useMemo, useState } from "react";

import { useApplySortAsListOrderMutation } from "@/lib/api/mutations";
import { ItemStatus, type ListItem, type MemberRating } from "@/lib/types";
import { isQueryEmpty } from "@/lib/types/listView";
import { useAuthStore } from "@/stores/auth-store";
import { useDataStrategy } from "./useDataStrategy";
import { useExploreQuery } from "./useExploreQuery";
import { useListItemActions } from "./useListItemActions";
import { useListModals } from "./useListModals";
import { useListNavigationSearch } from "./useListNavigationSearch";
import { useListReordering } from "./useListReordering";
import { useViewerState } from "./useViewerState";

interface UseListDetailControllerProps {
  listId: number;
  country?: string | null;
}

export function useListDetailController({
  listId,
  country,
}: UseListDetailControllerProps) {
  const { user: currentUser } = useAuthStore();
  const modals = useListModals();
  const explore = useExploreQuery(listId);
  const { query } = explore;
  const data = useDataStrategy({ listId, query, country });
  const applySortMutation = useApplySortAsListOrderMutation();
  const viewer = useViewerState({
    pageItems: data.pageItems,
    pageMetadata: data.pageMetadata,
    groupBy: query.groupBy,
    isReorderMode: false,
  });
  const search = useListNavigationSearch({
    pageItems: data.pageItems,
    fullItems: data.fullItems,
    ensureFullItems: data.ensureFullItems,
  });
  const actions = useListItemActions({
    listId,
    listItems: data.pageItems,
    setListItems: data.setCachedItems,
    onListUpdated: data.onListUpdated,
    onItemDeleted: data.onItemDeleted,
    onItemStatusUpdated: data.onItemStatusUpdated,
    currentUserId: currentUser?.id,
    onRatingModalOpen: modals.openRatingModal,
  });
  const reordering = useListReordering({
    listId,
    fullItems: data.fullItems,
    ensureFullItems: data.ensureFullItems,
    onReorderSaved: data.onReorderSaved,
  });

  useEffect(() => {
    if (query.page > data.totalPages) explore.setPage(data.totalPages);
  }, [data.totalPages, explore, query.page]);

  const shouldInviteToRate = useMemo(
    () => (item: ListItem): boolean => {
      if (!currentUser || item.status !== ItemStatus.COMPLETED) return false;
      return !item.member_ratings?.some(
        (rating: MemberRating) => rating.user?.id === currentUser.id,
      );
    },
    [currentUser],
  );

  const handleSearchSelect = useCallback(
    (result: { id: number; pageIndex?: number }) => {
      if (result.pageIndex !== undefined) {
        explore.setPage(Math.floor(result.pageIndex / query.pageSize) + 1);
      }
      search.clearQuery();
      viewer.setHighlightedItemId(result.id);
    },
    [explore, query.pageSize, search, viewer],
  );

  const exploreIsEmpty = isQueryEmpty(query);
  const hasExplicitSort = query.sort.length > 0;
  const isSortPureCanonical =
    !hasExplicitSort ||
    (query.sort.length === 1 && query.sort[0].field === "list_order");
  const reorderDisabledReason = !exploreIsEmpty
    ? "Clear filters and grouping to edit the canonical order."
    : !isSortPureCanonical
      ? "Reset sort to default order to edit the canonical order."
      : undefined;
  const canApplySort = exploreIsEmpty && hasExplicitSort && !isSortPureCanonical;
  const [applySortPending, setApplySortPending] = useState(false);

  const handleApplySortAsListOrder = useCallback(async () => {
    if (!canApplySort || applySortPending) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "This will replace the canonical list order with the current sort. Continue?",
      )
    ) {
      return;
    }
    setApplySortPending(true);
    try {
      await applySortMutation.mutateAsync({ listId, sort: query.sort });
      explore.setSort([]);
      await data.refetchCurrentPage();
    } catch (error) {
      console.error("apply sort failed", error);
      if (typeof window !== "undefined") {
        window.alert(
          error instanceof Error
            ? error.message
            : "Failed to apply sort as list order.",
        );
      }
    } finally {
      setApplySortPending(false);
    }
  }, [
    applySortMutation,
    applySortPending,
    canApplySort,
    data,
    explore,
    listId,
    query.sort,
  ]);

  return {
    actions,
    applySortPending,
    canApplySort,
    currentUser,
    data,
    explore,
    exploreIsEmpty,
    handleApplySortAsListOrder,
    handleSearchSelect,
    modals,
    query,
    reorderDisabledReason,
    reordering,
    search,
    shouldInviteToRate,
    viewer,
  };
}
