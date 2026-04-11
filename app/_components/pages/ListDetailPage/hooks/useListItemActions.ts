import { useState } from "react";
import { useRouter } from "next/navigation";
import { useListsStore } from "@/app/_stores/lists-store";
import { ratingActions } from "@/lib/api";
import { ListType, ItemStatus, User, RatingCreate } from "@/lib/types";
import { ListItem, MemberRating } from "@/lib/types";

interface UseListItemActionsOptions {
  listId: number;
  listItems: ListItem[];
  setListItems: React.Dispatch<React.SetStateAction<ListItem[]>>;
  onListUpdated?: (name: string, description?: string, listType?: ListType) => void;
  onItemDeleted?: (item: ListItem) => void;
  onItemStatusUpdated?: (
    itemId: number,
    previousStatus: ItemStatus,
    nextStatus: ItemStatus
  ) => void;
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
  handleSubmitRating: (item: ListItem, data: RatingCreate) => Promise<void>;
}

export function useListItemActions({
  listId,
  listItems,
  setListItems,
  onListUpdated,
  onItemDeleted,
  onItemStatusUpdated,
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
      onListUpdated?.(name, description, listType);
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
      const itemToDelete = listItems.find((item) => item.id === itemId);
      await deleteListItem(listId, itemId);
      setListItems((prev) => prev.filter((item) => item.id !== itemId));
      if (itemToDelete) {
        onItemDeleted?.(itemToDelete);
      }
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

    try {
      await updateListItemStatus(listId, itemId, newStatus);
      onItemStatusUpdated?.(itemId, currentStatus as ItemStatus, newStatus);

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
            onRatingModalOpen({ ...item, status: newStatus });
          }
        }
      }
    } catch (err) {
      setListItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                status: currentStatus as ItemStatus,
                completed_at: null,
              }
            : item
        )
      );
      setError(
        err instanceof Error ? err.message : "Failed to update item status"
      );
    }
  };

  const handleSubmitRating = async (item: ListItem, data: RatingCreate) => {
    if (!currentUserId) return;

    setActionLoading(true);

    try {
      await ratingActions.create(data);

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
                    score: parseFloat(data.score),
                  },
                ] as MemberRating[],
              }
            : prevItem
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rate item");
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  return {
    actionLoading,
    error,
    handleUpdateList,
    handleDeleteList,
    handleDeleteItem,
    handleToggleItemStatus,
    handleSubmitRating,
  };
}
