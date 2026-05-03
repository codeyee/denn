
import { useCallback, useEffect, useMemo, useState } from "react";
import { Navbar } from "../../layout/Navbar";
import { Footer } from "../../layout/Footer";
import { ListItemSkeleton } from "../../common/lists/ListItemSkeleton";
import { VerticalList } from "../../common/lists/VerticalList";
import { ItemStatus, ListItem, MemberRating } from "@/lib/types";
import { isQueryEmpty } from "@/lib/types/listView";
import { useAuthStore } from "@/stores/auth-store";
import { useApplySortAsListOrderMutation } from "@/lib/api/mutations";

import { useListModals } from "./hooks/useListModals";
import { useExploreQuery } from "./hooks/useExploreQuery";
import { useListItemActions } from "./hooks/useListItemActions";
import { useListReordering } from "./hooks/useListReordering";
import { useListNavigationSearch } from "./hooks/useListNavigationSearch";
import { useDataStrategy } from "./hooks/useDataStrategy";
import { useViewerState } from "./hooks/useViewerState";

import {
  ListHeader,
  ListSidebar,
  ItemsHeader,
  ExploreToolbar,
  ListHeaderPlaceholder,
  ItemsHeaderPlaceholder,
  ListSidebarPlaceholder,
  ListNavigationSearch,
} from "./components";
import { ListContentRenderer } from "./components/ListContentRenderer";
import { ListModals } from "./components/ListModals";

interface ListDetailPageProps {
  listId: number;
  country?: string | null;
}

export function ListDetailPage({ listId, country }: ListDetailPageProps) {
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
    if (query.page > data.totalPages) {
      explore.setPage(data.totalPages);
    }
  }, [query.page, explore, data.totalPages]);

  const shouldInviteToRate = useMemo(() => {
    return (item: ListItem): boolean => {
      if (!currentUser || item.status !== ItemStatus.COMPLETED) return false;
      return !item.member_ratings?.some(
        (rating: MemberRating) => rating.user?.id === currentUser.id,
      );
    };
  }, [currentUser]);

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
      )
      return;
    setApplySortPending(true);
    try {
      await applySortMutation.mutateAsync({ listId, sort: query.sort });
      explore.setSort([]);
      await data.refetchCurrentPage();
    } catch (err) {
      console.error("apply sort failed", err);
      if (typeof window !== "undefined") {
        window.alert(
          err instanceof Error
            ? err.message
            : "Failed to apply sort as list order.",
        );
      }
    } finally {
      setApplySortPending(false);
    }
  }, [applySortMutation, applySortPending, canApplySort, data, explore, listId, query.sort]);

  if (data.loading) {
    return (
      <>
        <Navbar />
        <div className="relative w-full min-h-screen bg-background-logged-in">
          <div className="container mx-auto px-4 mt-8 pt-30 pb-8">
            <ListHeaderPlaceholder />
            <div className="flex flex-col md:flex-row gap-6 lg:gap-8">
              <div className="flex-1 min-w-0 pb-8 order-2 md:order-1">
                <ItemsHeaderPlaceholder />
                <VerticalList spacing="md">
                  {Array.from({ length: 10 }).map((_, index) => (
                    <ListItemSkeleton key={`skeleton-${index}`} index={index} />
                  ))}
                </VerticalList>
              </div>
              <ListSidebarPlaceholder />
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (data.error || !data.list) {
    return (
      <>
        <Navbar />
        <div className="relative w-full min-h-screen bg-background-logged-in">
          <div className="container mx-auto px-4 mt-8 py-20">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <p className="text-red-400 text-xl mb-4">
                  {data.error || "List not found"}
                </p>
                <button
                  onClick={() => window.history.back()}
                  className="text-white/80 hover:text-white underline cursor-pointer"
                >
                  Go back
                </button>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="relative w-full min-h-screen bg-background-logged-in">
        <div className="container mx-auto px-4 mt-8 pt-30 pb-8">
          <ListHeader list={data.list} />

          <div className="flex flex-col md:flex-row gap-6 lg:gap-8">
            <div className="flex-1 min-w-0 pb-8 order-2 md:order-1">
              <ExploreToolbar
                query={query}
                totalItemCount={data.totalItemCount}
                isReorderMode={reordering.isReorderMode}
                canApplySort={canApplySort}
                applySortHint={
                  canApplySort
                    ? "Promote the current sort to the canonical list order."
                    : exploreIsEmpty
                    ? "Set an explicit sort (other than default order) to enable promotion."
                    : "Clear filters and grouping to enable promotion."
                }
                applySortPending={applySortPending}
                onSetSort={explore.setSort}
                onSetGroupBy={explore.setGroupBy}
                onSetFilter={explore.setFilter}
                onSetPageSize={explore.setPageSize}
                onResetExploration={explore.resetExploration}
                onApplySortAsListOrder={handleApplySortAsListOrder}
              />

              <ItemsHeader
                itemCount={data.totalItemCount}
                viewMode={viewer.viewMode}
                currentPage={query.page}
                totalPages={data.totalPages}
                isReorderMode={reordering.isReorderMode}
                onViewModeChange={viewer.setViewMode}
                onPageChange={explore.setPage}
              />

              {!reordering.isReorderMode ? (
                <ListNavigationSearch
                  query={search.query}
                  results={search.results}
                  isLoading={search.isLoading}
                  disabled={reordering.isReorderMode}
                  canSearchAll={search.canSearchAll}
                  hasSearchedAll={search.hasSearchedAll}
                  onQueryChange={search.setQuery}
                  onClear={search.clearQuery}
                  onSelectResult={handleSearchSelect}
                  onSearchAll={search.searchAll}
                />
              ) : null}

              <ListContentRenderer
                totalItemCount={data.totalItemCount}
                isReorderMode={reordering.isReorderMode}
                isViewerLoading={data.itemsLoading}
                viewMode={viewer.viewMode}
                displayItems={viewer.displayItems}
                groupedItems={viewer.groupedItems}
                highlightedItemId={viewer.highlightedItemId}
                list={data.list}
                currentUserId={currentUser?.id}
                reorderItems={reordering.reorderItems}
                activeId={reordering.activeId}
                onToggleStatus={actions.handleToggleItemStatus}
                onDelete={modals.openDeleteItemDialog}
                onRate={modals.openRatingModal}
                shouldInviteToRate={shouldInviteToRate}
                onDragStart={reordering.handleDragStart}
                onDragOver={reordering.handleDragOver}
                onDragEnd={reordering.handleDragEnd}
                onDragCancel={reordering.handleDragCancel}
              />
            </div>

            <ListSidebar
              list={data.list}
              itemCount={data.totalItemCount}
              totalItemCount={data.totalItemCount}
              completedCount={data.completedCount}
              pendingCount={data.pendingCount}
              completionRate={data.completionRate}
              isReorderMode={reordering.isReorderMode}
              reorderLoading={reordering.reorderLoading}
              reorderPreparing={reordering.reorderPreparing}
              itemsLoading={data.itemsLoading || data.fullItemsLoading}
              reorderDisabledReason={reorderDisabledReason}
              onEditList={modals.openEditModal}
              onDeleteList={modals.openDeleteListDialog}
              onEnterReorderMode={() => {
                viewer.setViewMode("list");
                void reordering.handleEnterReorderMode();
              }}
              onCancelReorder={reordering.handleCancelReorder}
              onSaveReorder={reordering.handleSaveReorder}
            />
          </div>
        </div>
      </div>
      <Footer />

      <ListModals
        list={data.list}
        currentUser={currentUser}
        isEditModalOpen={modals.isEditModalOpen}
        isDeleteListDialogOpen={modals.isDeleteListDialogOpen}
        deleteItemId={modals.deleteItemId}
        ratingModalItem={modals.ratingModalItem}
        isRatingModalOpen={modals.isRatingModalOpen}
        actionLoading={actions.actionLoading}
        onCloseEditModal={modals.closeEditModal}
        onCloseDeleteListDialog={modals.closeDeleteListDialog}
        onCloseDeleteItemDialog={modals.closeDeleteItemDialog}
        onCloseRatingModal={modals.closeRatingModal}
        onUpdateList={actions.handleUpdateList}
        onDeleteList={actions.handleDeleteList}
        onDeleteItem={actions.handleDeleteItem}
        onSubmitRating={actions.handleSubmitRating}
      />
    </>
  );
}
