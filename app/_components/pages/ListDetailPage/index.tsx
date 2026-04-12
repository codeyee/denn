"use client";

import { useCallback, useEffect, useMemo } from "react";
import { Navbar } from "../../layout/Navbar";
import { Footer } from "../../layout/Footer";
import { ListItemSkeleton } from "../../common/lists/ListItemSkeleton";
import { VerticalList } from "../../common/lists/VerticalList";
import { ItemStatus, ListItem, MemberRating } from "@/lib/types";
import { GroupBy } from "@/lib/types/listView";
import { useAuthStore } from "@/app/_stores/auth-store";

import { useListModals } from "./hooks/useListModals";
import { useListPreferences } from "./hooks/useListPreferences";
import { useListItemActions } from "./hooks/useListItemActions";
import { useListReordering } from "./hooks/useListReordering";
import { useListNavigationSearch } from "./hooks/useListNavigationSearch";
import { useDataStrategy } from "./hooks/useDataStrategy";
import { useViewerState } from "./hooks/useViewerState";

import {
  ListHeader,
  ListSidebar,
  ItemsHeader,
  ListHeaderPlaceholder,
  ItemsHeaderPlaceholder,
  ListSidebarPlaceholder,
  ListNavigationSearch,
} from "./components";
import { ListContentRenderer } from "./components/ListContentRenderer";
import { ListModals } from "./components/ListModals";

interface ListDetailPageProps {
  listId: number;
}

export function ListDetailPage({ listId }: ListDetailPageProps) {
  const { user: currentUser } = useAuthStore();

  const modals = useListModals();
  const preferences = useListPreferences(listId);
  const {
    groupBy,
    sortBy,
    sortOrder,
    pageSize,
    currentPage,
    setGroupBy,
    setSortBy,
    setSortOrder,
    setPageSize,
    setCurrentPage,
  } = preferences;

  const data = useDataStrategy({ listId, currentPage, pageSize });

  const viewer = useViewerState({
    pageItems: data.pageItems,
    groupBy,
    sortBy,
    sortOrder,
    pageSize,
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
    if (currentPage > data.totalPages) {
      setCurrentPage(data.totalPages);
    }
  }, [currentPage, setCurrentPage, data.totalPages]);

  const shouldInviteToRate = useMemo(() => {
    return (item: ListItem): boolean => {
      if (!currentUser || item.status !== ItemStatus.COMPLETED) return false;
      return !item.member_ratings?.some(
        (rating: MemberRating) => rating.user?.id === currentUser.id,
      );
    };
  }, [currentUser]);

  const handleGroupChange = (nextGroupBy: GroupBy[]) => {
    setGroupBy(nextGroupBy);
    setCurrentPage(1);
    viewer.setHighlightedItemId(null);
  };

  const handleSortByChange = (nextSortBy: typeof sortBy) => {
    setSortBy(nextSortBy);
    setCurrentPage(1);
    viewer.setHighlightedItemId(null);
  };

  const handleSortOrderChange = (nextSortOrder: typeof sortOrder) => {
    setSortOrder(nextSortOrder);
    setCurrentPage(1);
    viewer.setHighlightedItemId(null);
  };

  const handlePageSizeChange = (nextPageSize: typeof pageSize) => {
    setPageSize(nextPageSize);
    setCurrentPage(1);
    viewer.setHighlightedItemId(null);
  };

  const handleSearchSelect = useCallback(
    (result: { id: number; pageIndex?: number }) => {
      if (result.pageIndex !== undefined) {
        setCurrentPage(Math.floor(result.pageIndex / pageSize) + 1);
      }
      search.clearQuery();
      viewer.setHighlightedItemId(result.id);
    },
    [pageSize, search, setCurrentPage, viewer],
  );

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
              <ItemsHeader
                itemCount={data.totalItemCount}
                viewMode={viewer.viewMode}
                sortBy={sortBy}
                hasGrouping={groupBy.length > 0}
                sortOrder={sortOrder}
                pageSize={pageSize}
                currentPage={currentPage}
                totalPages={data.totalPages}
                isReorderMode={reordering.isReorderMode}
                onViewModeChange={viewer.setViewMode}
                onSortOrderChange={handleSortOrderChange}
                onPageSizeChange={handlePageSizeChange}
                onPageChange={setCurrentPage}
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
              groups={groupBy}
              sortBy={sortBy}
              isReorderMode={reordering.isReorderMode}
              reorderLoading={reordering.reorderLoading}
              reorderPreparing={reordering.reorderPreparing}
              itemsLoading={data.itemsLoading || data.fullItemsLoading}
              onEditList={modals.openEditModal}
              onDeleteList={modals.openDeleteListDialog}
              onEnterReorderMode={() => {
                viewer.setViewMode("list");
                void reordering.handleEnterReorderMode();
              }}
              onCancelReorder={reordering.handleCancelReorder}
              onSaveReorder={reordering.handleSaveReorder}
              onGroupChange={handleGroupChange}
              onSortByChange={handleSortByChange}
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
