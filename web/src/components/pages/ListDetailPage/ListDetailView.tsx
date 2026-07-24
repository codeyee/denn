import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import {
  ExploreToolbar,
  ItemsHeader,
  ListHeader,
  ListNavigationSearch,
  ListSidebar,
} from "./components";
import { ListContentRenderer } from "./components/ListContentRenderer";
import { ListModals } from "./components/ListModals";
import type { useListDetailController } from "./hooks/useListDetailController";
import { ListErrorState, ListLoadingState } from "./ListDetailStates";

type Controller = ReturnType<typeof useListDetailController>;

export function ListDetailView({ controller }: { controller: Controller }) {
  const {
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
  } = controller;

  if (data.loading) return <ListLoadingState />;
  if (data.error || !data.list) {
    return <ListErrorState message={data.error || "List not found"} />;
  }

  return (
    <>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="relative min-h-screen w-full bg-background-logged-in">
        <div className="container mx-auto mt-8 px-4 pb-8 pt-30">
          <ListHeader list={data.list} />
          <div className="flex flex-col gap-6 md:flex-row lg:gap-8">
            <div className="order-2 min-w-0 flex-1 pb-8 md:order-1">
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
              {!reordering.isReorderMode && (
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
              )}
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
      </main>
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
