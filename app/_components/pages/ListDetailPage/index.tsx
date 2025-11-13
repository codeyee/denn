"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { listActions, ratingActions } from "@/lib/api";
import { UserListDetail, ListType, ItemStatus, Author } from "@/lib/api/types";
import { ListItem } from "@/types";
import { VerticalList } from "../../common/List";
import { ReorderableListItem } from "../../common/List/ReorderableListItem";
import { ReorderableListItemCard } from "../../cards/ListItemCard/ReorderableListItemCard";
import Navbar from "../../layout/Navbar";
import Footer from "../../layout/Footer";
import { Button } from "../../lib/button";
import EditListModal from "../../common/Modal/EditListModal";
import ConfirmDialog from "../../common/Modal/ConfirmDialog";
import RateItemModal from "../../common/Modal/RateItemModal";
import {
  User,
  Users,
  Package,
  Calendar,
  Edit,
  Trash2,
  CheckCircle,
  Circle,
  List as ListIcon,
  Grid,
  GripVertical,
  Save,
  X,
  Lock,
  Star,
} from "lucide-react";
import {
  getContentTypeIcon,
  getContentTypeLabel,
} from "@/lib/utils/contentTypeUtils";
import { formatReleaseDate } from "@/lib/utils/dateUtils";
import { formatSeasonTitle } from "@/lib/utils/titleUtils";
import { formatUserDisplayNameWithUsername } from "@/lib/utils/userUtils";
import { useListsStore } from "@/app/_stores/lists-store";
import { useUIStore } from "@/app/_stores/ui-store";
import { useAuthStore } from "@/app/_stores/auth-store";

interface ListDetailPageProps {
  listId: number;
}

export default function ListDetailPage({ listId }: ListDetailPageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [list, setList] = useState<UserListDetail | null>(null);
  const [listItems, setListItems] = useState<ListItem[]>([]);

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteListDialogOpen, setIsDeleteListDialogOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [ratingModalItem, setRatingModalItem] = useState<ListItem | null>(null);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);

  // View state
  const [viewMode, setViewMode] = useState<"list" | "gallery">("list");

  // Reorder state
  const [originalItems, setOriginalItems] = useState<ListItem[]>([]);
  const [reorderLoading, setReorderLoading] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);

  // Store actions
  const { updateList, deleteList, deleteListItem, updateListItemStatus, reorderListItems } =
    useListsStore();
  const { isReorderMode, enterReorderMode, exitReorderMode } = useUIStore();
  const { user: currentUser } = useAuthStore();

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  // Handle drag over - update visual order in real-time
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setOverId(over.id as number);

      setListItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);

        // Update list_order for all affected items
        return newItems.map((item, index) => ({
          ...item,
          list_order: index + 1,
        }));
      });
    }
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    // Reset activeId and overId after drag ends
    setActiveId(null);
    setOverId(null);
  };

  // Handle drag cancel
  const handleDragCancel = () => {
    setActiveId(null);
    setOverId(null);
    // Restore original order if in reorder mode
    if (isReorderMode && originalItems.length > 0) {
      setListItems([...originalItems]);
    }
  };

  // Initial fetch
  useEffect(() => {
    const fetchList = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch list details (includes all items)
        const listData = await listActions.get(listId);
        setList(listData);
        setListItems(listData.items);
      } catch (err) {
        console.error("Error fetching list:", err);
        setError(err instanceof Error ? err.message : "Failed to load list");
      } finally {
        setLoading(false);
      }
    };

    fetchList();
  }, [listId]);

  // Handler functions
  const handleUpdateList = async (
    name: string,
    description?: string,
    listType?: ListType
  ) => {
    setActionLoading(true);
    try {
      await updateList(listId, name, description, listType);
      // Refetch list to get updated data
      const listData = await listActions.get(listId);
      setList(listData);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteList = async () => {
    setActionLoading(true);
    try {
      await deleteList(listId);
      // Navigate back to lists page after deletion
      router.push("/");
    } catch (err) {
      setActionLoading(false);
      setError(err instanceof Error ? err.message : "Failed to delete list");
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    setActionLoading(true);
    try {
      await deleteListItem(listId, itemId);
      // Remove item from local state
      setListItems((prev) => prev.filter((item) => item.id !== itemId));
      // No need to manually update item_count, we'll use listItems.length
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item");
    } finally {
      setActionLoading(false);
      setDeleteItemId(null);
    }
  };

  const handleToggleItemStatus = async (
    itemId: number,
    currentStatus: string
  ) => {
    const newStatus =
      currentStatus === ItemStatus.COMPLETED
        ? ItemStatus.PENDING
        : ItemStatus.COMPLETED;

    try {
      await updateListItemStatus(listId, itemId, newStatus);
      // Update item in local state
      setListItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                status: newStatus,
                completed_at:
                  newStatus === ItemStatus.COMPLETED
                    ? new Date().toISOString()
                    : null,
              }
            : item
        )
      );

      // If marking as completed, check if user should rate the item
      if (newStatus === ItemStatus.COMPLETED && currentUser) {
        const item = listItems.find(i => i.id === itemId);
        if (item) {
          // Check if user has already rated this item
          const hasUserRated = item.member_ratings &&
            Array.isArray(item.member_ratings) &&
            item.member_ratings.some((rating: any) =>
              rating.user?.id === currentUser.id
            );

          // Show rating modal if user hasn't rated yet
          if (!hasUserRated) {
            setRatingModalItem(item);
            setIsRatingModalOpen(true);
          }
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update item status"
      );
    }
  };

  // Rating handler
  const handleRateItem = async (rating: number) => {
    if (!ratingModalItem || !currentUser) return;

    try {
      const contentItem = ratingModalItem.content_item;
      await ratingActions.create({
        source_api: contentItem.source_api,
        external_id: String(contentItem.external_id),
        content_type: contentItem.content_type,
        score: String(rating),
      });

      // Update local state to reflect the new rating
      setListItems((prev) =>
        prev.map((item) =>
          item.id === ratingModalItem.id
            ? {
                ...item,
                member_rating_count: item.member_rating_count + 1,
                member_ratings: [
                  ...(Array.isArray(item.member_ratings) ? item.member_ratings : []),
                  {
                    user: currentUser,
                    rating: rating,
                  },
                ],
              }
            : item
        )
      );

      // Refetch list to get updated ratings
      const listData = await listActions.get(listId);
      setListItems(listData.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rate item");
    }
  };

  // Reorder mode handlers
  const handleEnterReorderMode = () => {
    // Save original order for cancel
    setOriginalItems([...listItems]);
    enterReorderMode(listId);
  };

  const handleExitReorderMode = () => {
    exitReorderMode();
  };

  const handleCancelReorder = () => {
    setListItems([...originalItems]); // Restore original order
    exitReorderMode();
  };

  const handleSaveReorder = async () => {
    try {
      setReorderLoading(true);
      const itemIds = listItems.map((item) => item.id);
      await reorderListItems(listId, itemIds);
      exitReorderMode();
      setOriginalItems([]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save reorder"
      );
    } finally {
      setReorderLoading(false);
    }
  };

  // Helper to check if user should be invited to rate an item
  const shouldInviteToRate = (item: ListItem): boolean => {
    if (!currentUser || item.status !== ItemStatus.COMPLETED) {
      return false;
    }

    // Check if user has already rated this item
    const hasUserRated = item.member_ratings &&
      Array.isArray(item.member_ratings) &&
      item.member_ratings.some((rating: any) =>
        rating.user?.id === currentUser.id
      );

    return !hasUserRated;
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
                  onClick={() => router.back()}
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

  const isShared = list.list_type === ListType.SHARED;
  const ListTypeIcon = isShared ? Users : Lock;
  const listTypeLabel = isShared ? "Shared List" : "Personal List";
  const memberCount = list.member_count || (list.members?.length || 0).toString();
  // Use listItems.length directly as source of truth for item count
  const itemCount = listItems.length;
  const completedCount = listItems.filter(
    (item) => item.status === ItemStatus.COMPLETED
  ).length;
  const pendingCount = listItems.filter(
    (item) => item.status === ItemStatus.PENDING
  ).length;

  return (
    <>
      <Navbar />
      <div className="relative w-full min-h-screen bg-background-logged-in">
        <div className="container mx-auto px-4 mt-8 pt-30 pb-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <ListTypeIcon className="w-8 h-8 text-white/80" />
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                  {list.name}
                </h1>
                <p className="text-white/60 text-sm">{listTypeLabel}</p>
              </div>
            </div>

            {list.description && (
              <p className="text-gray-300 text-lg mb-4">{list.description}</p>
            )}
          </div>

          {/* 2-Column Layout: List Items + Sidebar */}
          <div className="flex flex-col md:flex-row gap-6 lg:gap-8">
            {/* Left Column: List Items */}
            <div className="flex-1 min-w-0 pb-8 order-2 md:order-1">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Items</h2>
                <div className="flex items-center gap-3">
                  <div className="text-white/60 text-sm">
                    {itemCount} {itemCount === 1 ? "item" : "items"}
                  </div>
                  {/* View Toggle */}
                  <div className="flex gap-1 bg-white/5 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-2 rounded transition-colors cursor-pointer ${
                        viewMode === "list"
                          ? "bg-white/10 text-white"
                          : "text-white/60 hover:text-white"
                      }`}
                      title="List view"
                      disabled={isReorderMode}
                    >
                      <ListIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("gallery")}
                      className={`p-2 rounded transition-colors cursor-pointer ${
                        viewMode === "gallery"
                          ? "bg-white/10 text-white"
                          : "text-white/60 hover:text-white"
                      }`}
                      title="Gallery view"
                      disabled={isReorderMode}
                    >
                      <Grid className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>


              {listItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center bg-white/5 rounded-2xl">
                  <Package className="w-16 h-16 text-gray-400 opacity-50 mb-4" />
                  <p className="text-gray-400 text-lg">This list is empty</p>
                  <p className="text-gray-500 text-sm">
                    Add items to get started
                  </p>
                </div>
              ) : viewMode === "list" ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  onDragCancel={handleDragCancel}
                >
                  <SortableContext
                    items={listItems.map((item) => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <VerticalList spacing="md">
                      {listItems.map((item) => {
                    const contentItem = item.content_item;
                    const sourceData = contentItem.source_data;
                    const ContentIcon = getContentTypeIcon(
                      contentItem.content_type
                    );
                    const imageUrl = sourceData?.image_url;

                    // For seasons, format title to avoid redundancy
                    const isSeason = contentItem.content_type === "SEASON";
                    const title = isSeason && "tv_show_name" in sourceData
                      ? formatSeasonTitle(sourceData.tv_show_name, sourceData.title)
                      : sourceData?.title || "Untitled";

                    return (
                      <ReorderableListItem
                        key={item.id}
                        id={item.id}
                        activeId={activeId}
                        isReorderMode={isReorderMode}
                        title={title}
                        description={
                          "original_title" in sourceData &&
                          sourceData.original_title !== sourceData.title
                            ? sourceData.original_title
                            : undefined
                        }
                        subDescription={
                          (contentItem.content_type === "ALBUM" ||
                            contentItem.content_type === "BOOK") &&
                          "authors" in sourceData &&
                          sourceData.authors
                            ? (sourceData.authors as Author[])
                                ?.map((author) => author.name)
                                .join(", ")
                            : undefined
                        }
                        rating={item.list_rating}
                        image={imageUrl}
                        imageAlt={sourceData?.title}
                        imageFullHeight={true}
                        leadingContent={
                          <div className="flex items-center gap-3">
                            {/* Item number */}
                            <div className="text-white/60 text-sm font-mono w-8 text-center">
                              #{item.list_order}
                            </div>
                            {/* Content type icon */}
                            <ContentIcon className="w-5 h-5 text-white/60" />
                          </div>
                        }
                        trailingContent={
                          <div className="flex items-center gap-3">
                            {/* Status badge */}
                            {item.status && (
                              <div
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                                  item.status === ItemStatus.COMPLETED
                                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                    : "bg-white/10 text-white/80 border border-white/20"
                                }`}
                              >
                                {item.status === ItemStatus.COMPLETED
                                  ? "COMPLETED"
                                  : "PENDING"}
                              </div>
                            )}
                            {/* Rating */}
                            {item.list_rating && (
                              <div className="text-yellow-400 text-sm font-medium">
                                ★ {item.list_rating}
                              </div>
                            )}
                          </div>
                        }
                        expandedContent={
                          <div className="space-y-3">
                            {item.notes && (
                              <div>
                                <h4 className="text-white/80 font-semibold text-sm mb-1">
                                  Notes
                                </h4>
                                <p className="text-white/60 text-sm">
                                  {item.notes}
                                </p>
                              </div>
                            )}

                            {/* List Item Metadata */}
                            <div className="pt-2 border-t border-white/10 space-y-2">
                              <h4 className="text-white/80 font-semibold text-sm mb-2">
                                List Item Details
                              </h4>
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                  <span className="text-white/60">Added by:</span>
                                  {(() => {
                                    const { displayName, username } = formatUserDisplayNameWithUsername(item.added_by);
                                    return (
                                      <>
                                        <p className="text-white mt-0.5">
                                          {displayName}
                                        </p>
                                        {username && (
                                          <p className="text-white/50 text-xs">
                                            @{username}
                                          </p>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                                {item.added_at && (
                                  <div>
                                    <span className="text-white/60">Added on:</span>
                                    <p className="text-white mt-0.5">
                                      {formatReleaseDate(item.added_at)}
                                    </p>
                                  </div>
                                )}
                                {item.list_rating && (
                                  <div>
                                    <span className="text-white/60">List Rating:</span>
                                    <p className="text-yellow-400 mt-0.5 font-medium">
                                      ★ {item.list_rating}
                                    </p>
                                  </div>
                                )}
                                {item.completed_at && (
                                  <div>
                                    <span className="text-white/60">Completed on:</span>
                                    <p className="text-white mt-0.5">
                                      {formatReleaseDate(item.completed_at)}
                                    </p>
                                  </div>
                                )}
                                {item.member_rating_count > 0 && (
                                  <div>
                                    <span className="text-white/60">Member Ratings:</span>
                                    <p className="text-white mt-0.5">
                                      {item.member_rating_count} {item.member_rating_count === 1 ? 'rating' : 'ratings'}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Member Ratings List */}
                              {item.member_ratings && Array.isArray(item.member_ratings) && item.member_ratings.length > 0 && (
                                <div className="pt-2 mt-2 border-t border-white/10">
                                  <span className="text-white/60 text-xs">All Member Ratings:</span>
                                  <div className="mt-2 space-y-2">
                                    {item.member_ratings.map((rating: any, idx: number) => (
                                      <div key={idx} className="flex items-center justify-between bg-white/5 rounded px-2 py-1.5">
                                        <span className="text-white/80 text-xs">
                                          {rating.user?.username || rating.user?.email || 'Unknown User'}
                                        </span>
                                        <span className="text-yellow-400 text-xs font-medium">
                                          ★ {rating.rating}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Rating Invitation */}
                            {shouldInviteToRate(item) && (
                              <div className="pt-3 mt-3 border-t border-white/10">
                                <div className="bg-yellow-600/10 border border-yellow-600/30 rounded-lg p-3">
                                  <div className="flex items-start gap-2">
                                    <Star className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                      <p className="text-yellow-400 font-semibold text-sm">
                                        Rate this item
                                      </p>
                                      <p className="text-yellow-300/80 text-xs mt-1">
                                        You've completed this item! Share your rating with the list.
                                      </p>
                                    </div>
                                    <Button
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setRatingModalItem(item);
                                        setIsRatingModalOpen(true);
                                      }}
                                      className="shrink-0 bg-yellow-600 hover:bg-yellow-700 text-white cursor-pointer"
                                    >
                                      Rate Now
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-2">
                              <Button
                                size="lg"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleItemStatus(item.id, item.status);
                                }}
                                title={
                                  item.status === ItemStatus.COMPLETED
                                    ? "Mark as Pending"
                                    : "Mark as Completed"
                                }
                                className={`flex-1 cursor-pointer font-semibold ${
                                  item.status === ItemStatus.COMPLETED
                                    ? "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                                    : "bg-green-600 hover:bg-green-700 text-white"
                                }`}
                              >
                                {item.status === ItemStatus.COMPLETED ? (
                                  <>
                                    <Circle className="w-5 h-5 mr-2" />
                                    Mark as Pending
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-5 h-5 mr-2" />
                                    Mark Complete
                                  </>
                                )}
                              </Button>
                              <Button
                                size="lg"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteItemId(item.id);
                                }}
                                className="cursor-pointer bg-red-600/20 hover:bg-red-600/40 text-red-400 hover:text-red-300 border border-red-600/30"
                                title="Remove item"
                              >
                                <Trash2 className="w-5 h-5" />
                              </Button>
                            </div>
                          </div>
                        }
                      />
                    );
                      })}
                    </VerticalList>
                  </SortableContext>
                  <DragOverlay>
                    {activeId ? (
                      (() => {
                        const item = listItems.find((i) => i.id === activeId);
                        if (!item) return null;

                        const contentItem = item.content_item;
                        const sourceData = contentItem.source_data;
                        const ContentIcon = getContentTypeIcon(
                          contentItem.content_type
                        );
                        const imageUrl = sourceData?.image_url;

                        const isSeason = contentItem.content_type === "SEASON";
                        const title = isSeason && "tv_show_name" in sourceData
                          ? formatSeasonTitle(sourceData.tv_show_name, sourceData.title)
                          : sourceData?.title || "Untitled";

                        return (
                          <div className="opacity-80 shadow-2xl pointer-events-none">
                            <ReorderableListItem
                              id={item.id}
                              activeId={null}
                              isReorderMode={true}
                              title={title}
                              description={
                                "original_title" in sourceData &&
                                sourceData.original_title !== sourceData.title
                                  ? sourceData.original_title
                                  : undefined
                              }
                              subDescription={
                                (contentItem.content_type === "ALBUM" ||
                                  contentItem.content_type === "BOOK") &&
                                "authors" in sourceData &&
                                sourceData.authors
                                  ? (sourceData.authors as Author[])
                                      ?.map((author) => author.name)
                                      .join(", ")
                                  : undefined
                              }
                              rating={item.list_rating}
                              image={imageUrl}
                              imageAlt={sourceData?.title}
                              imageFullHeight={true}
                              leadingContent={
                                <div className="flex items-center gap-3">
                                  <div className="text-white/60 text-sm font-mono w-8 text-center">
                                    #{item.list_order}
                                  </div>
                                  <ContentIcon className="w-5 h-5 text-white/60" />
                                </div>
                              }
                              trailingContent={
                                <div className="flex items-center gap-3">
                                  {item.status && (
                                    <div
                                      className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                                        item.status === ItemStatus.COMPLETED
                                          ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                          : "bg-white/10 text-white/80 border border-white/20"
                                      }`}
                                    >
                                      {item.status === ItemStatus.COMPLETED
                                        ? "COMPLETED"
                                        : "PENDING"}
                                    </div>
                                  )}
                                  {item.list_rating && (
                                    <div className="text-yellow-400 text-sm font-medium">
                                      ★ {item.list_rating}
                                    </div>
                                  )}
                                </div>
                              }
                            />
                          </div>
                        );
                      })()
                    ) : null}
                  </DragOverlay>
                </DndContext>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  onDragCancel={handleDragCancel}
                >
                  <SortableContext
                    items={listItems.map((item) => item.id)}
                    strategy={rectSortingStrategy}
                  >
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-6 5xl:grid-cols-7 6xl:grid-cols-8 gap-4">
                      {listItems.map((item) => (
                        <ReorderableListItemCard
                          key={item.id}
                          item={item}
                          activeId={activeId}
                          onToggleStatus={handleToggleItemStatus}
                          onDelete={(itemId: number) => setDeleteItemId(itemId)}
                          onRateClick={() => {
                            setRatingModalItem(item);
                            setIsRatingModalOpen(true);
                          }}
                          showRatingInvitation={shouldInviteToRate(item)}
                          isReorderMode={isReorderMode}
                        />
                      ))}
                    </div>
                  </SortableContext>
                  <DragOverlay>
                    {activeId ? (
                      (() => {
                        const item = listItems.find((i) => i.id === activeId);
                        if (!item) return null;

                        return (
                          <div className="opacity-80 shadow-2xl pointer-events-none">
                            <ReorderableListItemCard
                              item={item}
                              activeId={null}
                              onToggleStatus={handleToggleItemStatus}
                              onDelete={(itemId: number) => setDeleteItemId(itemId)}
                              onRateClick={() => {
                                setRatingModalItem(item);
                                setIsRatingModalOpen(true);
                              }}
                              showRatingInvitation={shouldInviteToRate(item)}
                              isReorderMode={true}
                            />
                          </div>
                        );
                      })()
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}

            </div>

            {/* Right Column: Sidebar - Sticky */}
            <div className="w-full md:w-80 lg:w-96 shrink-0 space-y-6 order-1 md:order-2 md:sticky md:top-24 md:self-start md:max-h-[calc(100vh-8rem)] md:overflow-y-auto">
              {/* List Actions Card */}
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <h3 className="text-xl font-bold text-white mb-4">
                  List Actions
                </h3>
                <div className="space-y-3">
                  {!isReorderMode ? (
                    <>
                      <Button
                        onClick={handleEnterReorderMode}
                        className="w-full flex items-center justify-center gap-2 cursor-pointer bg-blue-600 text-white hover:bg-blue-700 font-semibold"
                        size="lg"
                        disabled={listItems.length === 0}
                      >
                        <GripVertical className="w-5 h-5" />
                        Reorder Items
                      </Button>
                      <Button
                        onClick={() => setIsEditModalOpen(true)}
                        className="w-full flex items-center justify-center gap-2 cursor-pointer bg-white text-black hover:bg-white/90 font-semibold"
                        size="lg"
                      >
                        <Edit className="w-5 h-5" />
                        Edit List
                      </Button>
                      <Button
                        onClick={() => setIsDeleteListDialogOpen(true)}
                        variant="destructive"
                        className="w-full flex items-center justify-center gap-2 cursor-pointer font-semibold"
                        size="lg"
                      >
                        <Trash2 className="w-5 h-5" />
                        Delete List
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={handleSaveReorder}
                        className="w-full flex items-center justify-center gap-2 cursor-pointer bg-green-600 text-white hover:bg-green-700 font-semibold"
                        size="lg"
                        disabled={reorderLoading}
                      >
                        <Save className="w-5 h-5" />
                        {reorderLoading ? "Saving..." : "Save Order"}
                      </Button>
                      <Button
                        onClick={handleCancelReorder}
                        variant="outline"
                        className="w-full flex items-center justify-center gap-2 cursor-pointer font-semibold"
                        size="lg"
                        disabled={reorderLoading}
                      >
                        <X className="w-5 h-5" />
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* List Stats Card */}
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <h3 className="text-xl font-bold text-white mb-4">Stats</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/60">
                      <Package className="w-4 h-4" />
                      <span>Total Items</span>
                    </div>
                    <span className="text-white font-bold text-lg">
                      {itemCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      <span>Completed</span>
                    </div>
                    <span className="text-white font-bold text-lg">
                      {completedCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/60">
                      <Circle className="w-4 h-4" />
                      <span>Pending</span>
                    </div>
                    <span className="text-white font-bold text-lg">
                      {pendingCount}
                    </span>
                  </div>
                  {itemCount > 0 && (
                    <div className="pt-3 border-t border-white/10">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Completion Rate</span>
                        <span className="text-white font-bold">
                          {Math.round((completedCount / itemCount) * 100)}%
                        </span>
                      </div>
                      <div className="mt-2 w-full bg-white/10 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{
                            width: `${(completedCount / itemCount) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* List Info Card */}
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <h3 className="text-xl font-bold text-white mb-4">Info</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-white/60 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-white/60">Owner</div>
                      {(() => {
                        const { displayName, username } = formatUserDisplayNameWithUsername(list.owner);
                        return (
                          <>
                            <div className="text-white font-medium">
                              {displayName}
                            </div>
                            {username && (
                              <div className="text-white/50 text-xs">
                                @{username}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  {isShared && (
                    <div className="flex items-start gap-2">
                      <Users className="w-4 h-4 text-white/60 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-white/60">Members</div>
                        <div className="text-white font-medium">
                          {memberCount}{" "}
                          {parseInt(memberCount) === 1 ? "member" : "members"}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-white/60 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-white/60">Created</div>
                      <div className="text-white font-medium">
                        {formatReleaseDate(list.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Members Section (for shared lists) */}
              {isShared && list.members && list.members.length > 0 && (
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                  <h3 className="text-xl font-bold text-white mb-4">
                    Members
                  </h3>
                  <div className="space-y-2">
                    {list.members.map((member) => {
                      const { displayName, username } = formatUserDisplayNameWithUsername(member);
                      return (
                        <div
                          key={member.id}
                          className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                        >
                          <User className="w-5 h-5 text-white/60" />
                          <div>
                            <p className="text-white font-medium">
                              {displayName}
                            </p>
                            {username && (
                              <p className="text-white/60 text-sm">
                                @{username}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />

      {/* Edit List Modal */}
      <EditListModal
        isOpen={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onUpdateList={handleUpdateList}
        isLoading={actionLoading}
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

      {/* Delete List Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteListDialogOpen}
        onOpenChange={setIsDeleteListDialogOpen}
        onConfirm={handleDeleteList}
        title="Delete List"
        description={`Are you sure you want to delete "${list?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={actionLoading}
      />

      {/* Delete Item Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteItemId !== null}
        onOpenChange={(open) => !open && setDeleteItemId(null)}
        onConfirm={() => {
          if (deleteItemId) {
            return handleDeleteItem(deleteItemId);
          }
        }}
        title="Remove Item"
        description="Are you sure you want to remove this item from the list?"
        confirmText="Remove"
        cancelText="Cancel"
        variant="danger"
        isLoading={actionLoading}
      />

      {/* Rate Item Modal */}
      {ratingModalItem && (
        <RateItemModal
          isOpen={isRatingModalOpen}
          onOpenChange={setIsRatingModalOpen}
          onRate={handleRateItem}
          itemTitle={
            ratingModalItem.content_item.content_type === "SEASON" &&
            "tv_show_name" in ratingModalItem.content_item.source_data
              ? formatSeasonTitle(
                  ratingModalItem.content_item.source_data.tv_show_name,
                  ratingModalItem.content_item.source_data.title
                )
              : ratingModalItem.content_item.source_data?.title || "this item"
          }
          isLoading={actionLoading}
        />
      )}
    </>
  );
}
