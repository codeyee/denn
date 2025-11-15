import { useState } from "react";
import { useRouter } from "next/navigation";
import { useListsStore } from "@/app/_stores/lists-store";
import { listActions, ratingActions } from "@/lib/api";
import { ListType, ItemStatus, User } from "@/lib/types";
import { ListItem, MemberRating } from "@/lib/types";

interface UseListItemActionsOptions {
  listId: number;
  listItems: ListItem[];
  setListItems: React.Dispatch<React.SetStateAction<ListItem[]>>;
  currentUserId?: number;
  onRatingModalOpen?: (item: ListItem) => void;
}

interface UseListItemActionsReturn {
  actionLoading: boolean;
  error: string | null;
  handleUpdateList: (name: string, description?: string, listType?: ListType) => Promise<void>;
  handleDeleteList: () => Promise<void>;
  handleDeleteItem: (itemId: number) => Promise<void>;
  handleToggleItemStatus: (itemId: number, currentStatus: string) => Promise<void>;
  handleRateItem: (item: ListItem, rating: number) => Promise<void>;
}

export function useListItemActions({
  listId,
  listItems,
  setListItems,
  currentUserId,
  onRatingModalOpen,
}: UseListItemActionsOptions): UseListItemActionsReturn {
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { updateList, deleteList, deleteListItem, updateListItemStatus } = useListsStore();

  const handleUpdateList = async (
    name: string,
    description?: string,
    listType?: ListType
  ) => {
    setActionLoading(true);
    try {
      await updateList(listId, name, description, listType);
      const listData = await listActions.get(listId);
      setListItems(listData.items as ListItem[]);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteList = async () => {
    setActionLoading(true);
    try {
      await deleteList(listId);
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
      setListItems((prev) => prev.filter((item) => item.id !== itemId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleItemStatus = async (itemId: number, currentStatus: string) => {
    const newStatus =
      currentStatus === ItemStatus.COMPLETED
        ? ItemStatus.PENDING
        : ItemStatus.COMPLETED;

    try {
      await updateListItemStatus(listId, itemId, newStatus);

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

      if (newStatus === ItemStatus.COMPLETED && currentUserId && onRatingModalOpen) {
        const item = listItems.find((i) => i.id === itemId);
        if (item) {
          const hasUserRated =
            item.member_ratings &&
            Array.isArray(item.member_ratings) &&
            item.member_ratings.some(
              (rating: MemberRating) => rating.user?.id === currentUserId
            );

          if (!hasUserRated) {
            onRatingModalOpen(item);
          }
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update item status"
      );
    }
  };

  const handleRateItem = async (item: ListItem, rating: number) => {
    if (!currentUserId) return;

    try {
      const contentItem = item.content_item;
      await ratingActions.create({
        source_api: contentItem.source_api,
        external_id: String(contentItem.external_id),
        content_type: contentItem.content_type,
        score: String(rating),
      });

      setListItems((prev) =>
        prev.map((prevItem) =>
          prevItem.id === item.id
            ? {
                ...prevItem,
                member_rating_count: prevItem.member_rating_count + 1,
                member_ratings: [
                  ...(Array.isArray(prevItem.member_ratings)
                    ? prevItem.member_ratings
                    : []),
                  {
                    user: { id: currentUserId } as User,
                    rating: rating,
                  },
                ] as MemberRating[],
              }
            : prevItem
        )
      );

      const listData = await listActions.get(listId);
      setListItems(listData.items as ListItem[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rate item");
    }
  };

  return {
    actionLoading,
    error,
    handleUpdateList,
    handleDeleteList,
    handleDeleteItem,
    handleToggleItemStatus,
    handleRateItem,
  };
}
