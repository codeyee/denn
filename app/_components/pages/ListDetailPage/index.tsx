"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listActions, listItemActions } from "@/lib/api";
import { UserListDetail, ListType, ItemStatus, Author } from "@/lib/api/types";
import { ListItem } from "@/types";
import { ExpandableListItem, VerticalList } from "../../common/List";
import Navbar from "../../layout/Navbar";
import Footer from "../../layout/Footer";
import { Button } from "../../lib/button";
import EditListModal from "../../common/Modal/EditListModal";
import ConfirmDialog from "../../common/Modal/ConfirmDialog";
import ListItemCard from "../../cards/ListItemCard";
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
} from "lucide-react";
import {
  getContentTypeIcon,
  getContentTypeLabel,
} from "@/lib/utils/contentTypeUtils";
import { formatReleaseDate } from "@/lib/utils/dateUtils";
import { useListsStore } from "@/app/_stores/lists-store";

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

  // View state
  const [viewMode, setViewMode] = useState<"list" | "gallery">("list");

  // Store actions
  const { updateList, deleteList, deleteListItem, updateListItemStatus } =
    useListsStore();

  useEffect(() => {
    const fetchList = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch list details
        const listData = await listActions.get(listId);
        setList(listData);

        // Fetch list items with expanded content_item data
        const itemsResponse = await listItemActions.list(listId);
        setListItems(itemsResponse.results as unknown as ListItem[]);
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
      router.push("/profile");
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
      // Update item count in list
      if (list) {
        setList({
          ...list,
          item_count: String(parseInt(list.item_count || "0") - 1),
        });
      }
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
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update item status"
      );
    }
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
  const ListTypeIcon = isShared ? Users : User;
  const listTypeLabel = isShared ? "Shared List" : "Personal List";
  const memberCount = list.member_count || (list.members?.length || 0).toString();
  const itemCount = list.item_count || listItems.length.toString();
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
                    {itemCount} {parseInt(itemCount) === 1 ? "item" : "items"}
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
                <VerticalList spacing="md">
                  {listItems.map((item) => {
                    const contentItem = item.content_item;
                    const sourceData = contentItem.source_data;
                    const ContentIcon = getContentTypeIcon(
                      contentItem.content_type
                    );
                    const contentTypeLabel = getContentTypeLabel(
                      contentItem.content_type
                    );
                    const imageUrl = sourceData?.image_url;

                    return (
                      <ExpandableListItem
                        key={item.id}
                        title={sourceData?.title || "Untitled"}
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
                            : contentItem.content_type === "SEASON" &&
                              "tv_show_name" in sourceData &&
                              sourceData.type === "SEASON"
                            ? sourceData.tv_show_name || undefined
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
                            {/* Action Buttons */}
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleItemStatus(item.id, item.status);
                                }}
                                title={
                                  item.status === ItemStatus.COMPLETED
                                    ? "Mark as Pending"
                                    : "Mark as Completed"
                                }
                                className="cursor-pointer hover:bg-white/10"
                              >
                                {item.status === ItemStatus.COMPLETED ? (
                                  <Circle className="w-5 h-5" />
                                ) : (
                                  <CheckCircle className="w-5 h-5 text-green-400" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteItemId(item.id);
                                }}
                                className="cursor-pointer hover:bg-red-500/10 text-red-400 hover:text-red-300"
                                title="Remove item"
                              >
                                <Trash2 className="w-5 h-5" />
                              </Button>
                            </div>
                          </div>
                        }
                        expandedContent={
                          <div className="space-y-3">
                            {"description" in sourceData &&
                              sourceData.description && (
                                <div>
                                  <h4 className="text-white/80 font-semibold text-sm mb-1">
                                    Description
                                  </h4>
                                  <p className="text-white/60 text-sm leading-relaxed">
                                    {sourceData.description}
                                  </p>
                                </div>
                              )}

                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-white/60">Type:</span>
                                <span className="text-white ml-2">
                                  {contentTypeLabel}
                                </span>
                              </div>
                              {sourceData?.release_date && (
                                <div>
                                  <span className="text-white/60">
                                    Release Date:
                                  </span>
                                  <span className="text-white ml-2">
                                    {formatReleaseDate(
                                      sourceData.release_date
                                    )}
                                  </span>
                                </div>
                              )}
                              {"duration_minutes" in sourceData &&
                                sourceData.duration_minutes && (
                                  <div>
                                    <span className="text-white/60">
                                      Duration:
                                    </span>
                                    <span className="text-white ml-2">
                                      {sourceData.duration_minutes} min
                                    </span>
                                  </div>
                                )}
                              {item.added_at && (
                                <div>
                                  <span className="text-white/60">Added:</span>
                                  <span className="text-white ml-2">
                                    {formatReleaseDate(item.added_at)}
                                  </span>
                                </div>
                              )}
                            </div>

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

                            <div className="pt-2 border-t border-white/10">
                              <p className="text-white/60 text-xs">
                                Added by{" "}
                                {item.added_by.username || item.added_by.email}
                              </p>
                            </div>
                          </div>
                        }
                      />
                    );
                  })}
                </VerticalList>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 4xl:grid-cols-5 5xl:grid-cols-6 6xl:grid-cols-7 gap-4">
                  {listItems.map((item) => (
                    <ListItemCard
                      key={item.id}
                      item={item}
                      onToggleStatus={handleToggleItemStatus}
                      onDelete={(itemId) => setDeleteItemId(itemId)}
                    />
                  ))}
                </div>
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
                  {itemCount !== "0" && (
                    <div className="pt-3 border-t border-white/10">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Completion Rate</span>
                        <span className="text-white font-bold">
                          {Math.round(
                            (completedCount / parseInt(itemCount)) * 100
                          )}
                          %
                        </span>
                      </div>
                      <div className="mt-2 w-full bg-white/10 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{
                            width: `${
                              (completedCount / parseInt(itemCount)) * 100
                            }%`,
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
                      <div className="text-white font-medium">
                        {list.owner.username || list.owner.email}
                      </div>
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
                    {list.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <User className="w-5 h-5 text-white/60" />
                        <div>
                          <p className="text-white font-medium">
                            {member.username || member.email}
                          </p>
                          {member.first_name && member.last_name && (
                            <p className="text-white/60 text-sm">
                              {member.first_name} {member.last_name}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
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
    </>
  );
}
