"use client";

import { useState, useMemo } from "react";
import { Package } from "lucide-react";
import Navbar from "../../layout/Navbar";
import Footer from "../../layout/Footer";
import EditListModal from "../../common/modals/EditListModal";
import ConfirmDialog from "../../common/modals/ConfirmDialog";
import RateItemModal from "../../common/modals/RateItemModal";
import { ItemStatus } from "@/lib/api/types";
import { ListItem, MemberRating } from "@/types";
import { GroupBy } from "@/types/listView";
import { formatSeasonTitle } from "@/lib/utils/titleUtils";
import { useAuthStore } from "@/app/_stores/auth-store";

import { useListData } from "./hooks/useListData";
import { useListModals } from "./hooks/useListModals";
import { useListPreferences } from "./hooks/useListPreferences";
import { useListItemActions } from "./hooks/useListItemActions";
import { useListReordering } from "./hooks/useListReordering";
import { useListStats } from "./hooks/useListStats";
import { useListPagination } from "./hooks/useListPagination";
import { useListGrouping } from "./hooks/useListGrouping";

import { ListHeader, ListSidebar, ItemsHeader } from "./components";
import { FlatListView } from "./components/ListView/FlatListView";
import { GroupedListView } from "./components/ListView/GroupedListView";
import { FlatGalleryView } from "./components/GalleryView/FlatGalleryView";
import { GroupedGalleryView } from "./components/GalleryView/GroupedGalleryView";

interface ListDetailPageProps {
  listId: number;
}

export default function ListDetailPage({ listId }: ListDetailPageProps) {
  const [viewMode, setViewMode] = useState<"list" | "gallery">("list");
  const { user: currentUser } = useAuthStore();

  const { loading, error, list, listItems, setListItems, refetch } =
    useListData(listId);

  const modals = useListModals();

  const preferences = useListPreferences(listId);
  const {
    groupBy,
    sortBy,
    sortOrder,
    pageSize,
    currentPage,
    setGroupBy,
    addGroupBy,
    removeGroupBy,
    clearGroupBy,
    setSortBy,
    setSortOrder,
    setPageSize,
    setCurrentPage,
  } = preferences;

  const pagination = useListPagination(currentPage);

  const actions = useListItemActions({
    listId,
    listItems,
    setListItems,
    currentUserId: currentUser?.id,
    onRatingModalOpen: modals.openRatingModal,
  });

  const reordering = useListReordering({
    listId,
    listItems,
    setListItems,
  });

  const stats = useListStats(listItems);

  const processedData = useListGrouping({
    listItems,
    groupBy,
    sortBy,
    sortOrder,
    currentPage,
    pageSize,
    isReorderMode: reordering.isReorderMode,
  });

  const shouldInviteToRate = useMemo(() => {
    return (item: ListItem): boolean => {
      if (!currentUser || item.status !== ItemStatus.COMPLETED) {
        return false;
      }

      const hasUserRated =
        item.member_ratings &&
        Array.isArray(item.member_ratings) &&
        item.member_ratings.some(
          (rating: MemberRating) => rating.user?.id === currentUser.id
        );

      return !hasUserRated;
    };
  }, [currentUser]);

  // Compute primary and secondary groups from groupBy array for UI compatibility
  const primaryGroup = groupBy[0] || "none";
  const secondaryGroup = groupBy[1] || "none";

  const handlePrimaryGroupChange = (group: GroupBy) => {
    if (group === "none") {
      clearGroupBy();
    } else {
      // Replace first group, keep rest
      const newGroupBy = [group, ...groupBy.slice(1)];
      setGroupBy(newGroupBy);
    }
    setCurrentPage(1);
    pagination.resetPagination();
  };

  const handleSecondaryGroupChange = (group: GroupBy) => {
    if (group === "none") {
      // Remove secondary group, keep only primary
      setGroupBy(groupBy.slice(0, 1));
    } else {
      // Set or replace secondary group
      const newGroupBy = [groupBy[0] || "none", group];
      setGroupBy(newGroupBy.filter(g => g !== "none"));
    }
    setCurrentPage(1);
    pagination.resetPagination();
  };

  const handleSortByChange = (newSortBy: typeof sortBy) => {
    setSortBy(newSortBy);
    setCurrentPage(1);
    pagination.resetPagination();
  };

  const handleSortOrderChange = (order: typeof sortOrder) => {
    setSortOrder(order);
    setCurrentPage(1);
    pagination.resetPagination();
  };

  const handlePageSizeChange = (size: typeof pageSize) => {
    setPageSize(size);
    setCurrentPage(1);
    pagination.resetPagination();
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="relative w-full min-h-screen bg-background-logged-in">
          <div className="container mx-auto px-4 mt-8 py-20">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-gray-400">Loading list...</p>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error || !list) {
    return (
      <>
        <Navbar />
        <div className="relative w-full min-h-screen bg-background-logged-in">
          <div className="container mx-auto px-4 mt-8 py-20">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <p className="text-red-400 text-xl mb-4">
                  {error || "List not found"}
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
          <ListHeader list={list} />

          <div className="flex flex-col md:flex-row gap-6 lg:gap-8">
            {/* Main Content */}
            <div className="flex-1 min-w-0 pb-8 order-2 md:order-1">
              <ItemsHeader
                itemCount={stats.itemCount}
                viewMode={viewMode}
                primaryGroup={primaryGroup}
                sortOrder={sortOrder}
                pageSize={pageSize}
                currentPage={currentPage}
                totalPages={processedData.paginationInfo.totalPages}
                isReorderMode={reordering.isReorderMode}
                onViewModeChange={setViewMode}
                onSortOrderChange={handleSortOrderChange}
                onPageSizeChange={handlePageSizeChange}
                onPageChange={setCurrentPage}
              />

              {listItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center bg-white/5 rounded-2xl">
                  <Package className="w-16 h-16 text-gray-400 opacity-50 mb-4" />
                  <p className="text-gray-400 text-lg">This list is empty</p>
                  <p className="text-gray-500 text-sm">
                    Add items to get started
                  </p>
                </div>
              ) : viewMode === "list" ? (
                processedData.groupedItems ? (
                  <GroupedListView
                    groups={processedData.groupedItems}
                    groupPages={pagination.groupPages}
                    subGroupPages={pagination.subGroupPages}
                    sortOrder={sortOrder}
                    pageSize={pageSize}
                    isReorderMode={reordering.isReorderMode}
                    onGroupPageChange={(groupKey, page) =>
                      pagination.setGroupPages((prev) => ({
                        ...prev,
                        [groupKey]: page,
                      }))
                    }
                    onSubGroupPageChange={(subGroupKey, page) =>
                      pagination.setSubGroupPages((prev) => ({
                        ...prev,
                        [subGroupKey]: page,
                      }))
                    }
                    onSortOrderChange={handleSortOrderChange}
                    onPageSizeChange={handlePageSizeChange}
                    onToggleStatus={actions.handleToggleItemStatus}
                    onDelete={(itemId) => modals.openDeleteItemDialog(itemId)}
                    onRate={modals.openRatingModal}
                    shouldInviteToRate={shouldInviteToRate}
                  />
                ) : (
                  <FlatListView
                    items={processedData.displayItems}
                    activeId={reordering.activeId}
                    isReorderMode={reordering.isReorderMode}
                    sensors={reordering.sensors}
                    onDragStart={reordering.handleDragStart}
                    onDragOver={reordering.handleDragOver}
                    onDragEnd={reordering.handleDragEnd}
                    onDragCancel={reordering.handleDragCancel}
                    onToggleStatus={actions.handleToggleItemStatus}
                    onDelete={(itemId) => modals.openDeleteItemDialog(itemId)}
                    onRate={modals.openRatingModal}
                    shouldInviteToRate={shouldInviteToRate}
                  />
                )
              ) : processedData.groupedItems ? (
                <GroupedGalleryView
                  groups={processedData.groupedItems}
                  groupPages={pagination.groupPages}
                  sortOrder={sortOrder}
                  pageSize={pageSize}
                  isReorderMode={reordering.isReorderMode}
                  onGroupPageChange={(groupKey, page) =>
                    pagination.setGroupPages((prev) => ({
                      ...prev,
                      [groupKey]: page,
                    }))
                  }
                  onSortOrderChange={handleSortOrderChange}
                  onPageSizeChange={handlePageSizeChange}
                  onToggleStatus={actions.handleToggleItemStatus}
                  onDelete={(itemId) => modals.openDeleteItemDialog(itemId)}
                  onRate={modals.openRatingModal}
                  shouldInviteToRate={shouldInviteToRate}
                />
              ) : (
                <FlatGalleryView
                  items={processedData.displayItems}
                  activeId={reordering.activeId}
                  isReorderMode={reordering.isReorderMode}
                  sensors={reordering.sensors}
                  onDragStart={reordering.handleDragStart}
                  onDragOver={reordering.handleDragOver}
                  onDragEnd={reordering.handleDragEnd}
                  onDragCancel={reordering.handleDragCancel}
                  onToggleStatus={actions.handleToggleItemStatus}
                  onDelete={(itemId) => modals.openDeleteItemDialog(itemId)}
                  onRate={modals.openRatingModal}
                  shouldInviteToRate={shouldInviteToRate}
                />
              )}
            </div>

            {/* Sidebar */}
            <ListSidebar
              list={list}
              itemCount={stats.itemCount}
              completedCount={stats.completedCount}
              pendingCount={stats.pendingCount}
              completionRate={stats.completionRate}
              primaryGroup={primaryGroup}
              secondaryGroup={secondaryGroup}
              sortBy={sortBy}
              isReorderMode={reordering.isReorderMode}
              reorderLoading={reordering.reorderLoading}
              onEditList={modals.openEditModal}
              onDeleteList={modals.openDeleteListDialog}
              onEnterReorderMode={reordering.handleEnterReorderMode}
              onCancelReorder={reordering.handleCancelReorder}
              onSaveReorder={reordering.handleSaveReorder}
              onPrimaryGroupChange={handlePrimaryGroupChange}
              onSecondaryGroupChange={handleSecondaryGroupChange}
              onSortByChange={handleSortByChange}
            />
          </div>
        </div>
      </div>
      <Footer />

      {/* Modals */}
      <EditListModal
        isOpen={modals.isEditModalOpen}
        onOpenChange={modals.closeEditModal}
        onUpdateList={actions.handleUpdateList}
        isLoading={actions.actionLoading}
        initialData={
          list
            ? {
                name: list.name,
                description: list.description || "",
                listType: list.list_type,
              }
            : undefined
        }
      />

      <ConfirmDialog
        isOpen={modals.isDeleteListDialogOpen}
        onOpenChange={modals.closeDeleteListDialog}
        onConfirm={actions.handleDeleteList}
        title="Delete List"
        description={`Are you sure you want to delete "${list?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={actions.actionLoading}
      />

      <ConfirmDialog
        isOpen={modals.deleteItemId !== null}
        onOpenChange={(open) => !open && modals.closeDeleteItemDialog()}
        onConfirm={() => {
          if (modals.deleteItemId) {
            return actions.handleDeleteItem(modals.deleteItemId);
          }
        }}
        title="Remove Item"
        description="Are you sure you want to remove this item from the list?"
        confirmText="Remove"
        cancelText="Cancel"
        variant="danger"
        isLoading={actions.actionLoading}
      />

      {modals.ratingModalItem && (
        <RateItemModal
          isOpen={modals.isRatingModalOpen}
          onOpenChange={modals.closeRatingModal}
          onRate={(rating) =>
            actions.handleRateItem(modals.ratingModalItem!, rating)
          }
          itemTitle={
            modals.ratingModalItem.content_item.content_type === "SEASON" &&
            "tv_show_name" in modals.ratingModalItem.content_item.source_data
              ? formatSeasonTitle(
                  modals.ratingModalItem.content_item.source_data.tv_show_name,
                  modals.ratingModalItem.content_item.source_data.title
                )
              : modals.ratingModalItem.content_item.source_data?.title ||
                "this item"
          }
          isLoading={actions.actionLoading}
        />
      )}
    </>
  );
}
