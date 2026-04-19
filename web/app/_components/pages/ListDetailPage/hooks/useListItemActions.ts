import { useState } from "react";
import { useRouter } from "next/navigation";
import { useListsStore } from "@/app/_stores/lists-store";
import {
  useRateContentMutation,
  useToggleListItemStatusMutation,
} from "@/lib/api/mutations";
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

/**
 * Snapshot used by `useToggleListItemStatusMutation` to restore the
 * previous ListItem in case of error.
 */
interface ToggleSnapshot {
  previousStatus: ItemStatus;
}

/**
 * Snapshot used by `useRateContentMutation` to revert the optimistic
 * rating row.
 */
interface RateSnapshot {
  previousMemberRatings: MemberRating[];
  previousMemberRatingCount: number;
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

  const { updateList, deleteList, deleteListItem } = useListsStore();

  // T7: optimistic toggle. The mutation cancels in-flight reads,
  // applies the patch via setListItems in onMutate, restores the
  // snapshot in onError, and invalidates the React Query cache on
  // settle.
  const toggleStatusMutation = useToggleListItemStatusMutation<ToggleSnapshot>({
    onMutate: ({ itemId, nextStatus }) => {
      const target = listItems.find((i) => i.id === itemId);
      const previousStatus = (target?.status ?? ItemStatus.PENDING) as ItemStatus;

      setListItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                status: nextStatus,
                completed_at:
                  nextStatus === ItemStatus.COMPLETED
                    ? new Date().toISOString()
                    : null,
              }
            : item
        )
      );

      return { previousStatus };
    },
    onError: (err, { itemId }, snapshot) => {
      setListItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                status: snapshot?.previousStatus ?? ItemStatus.PENDING,
                completed_at: null,
              }
            : item
        )
      );
      setError(err.message || "Failed to update item status");
    },
    onSuccess: ({ itemId, nextStatus }) => {
      setError(null);
      const previous = listItems.find((i) => i.id === itemId)?.status as ItemStatus;
      onItemStatusUpdated?.(itemId, previous, nextStatus);

      if (
        nextStatus === ItemStatus.COMPLETED &&
        currentUserId &&
        onRatingModalOpen
      ) {
        const item = listItems.find((i) => i.id === itemId);
        if (item) {
          const hasUserRated =
            item.member_ratings &&
            Array.isArray(item.member_ratings) &&
            item.member_ratings.some(
              (rating: MemberRating) => rating.user?.id === currentUserId
            );

          if (!hasUserRated) {
            onRatingModalOpen({ ...item, status: nextStatus });
          }
        }
      }
    },
  });

  const rateMutation = useRateContentMutation<RateSnapshot>({
    onMutate: ({ itemId, data }) => {
      const targetId = Number(itemId);
      const target = listItems.find((i) => i.id === targetId);

      const previousMemberRatings = Array.isArray(target?.member_ratings)
        ? target!.member_ratings
        : [];
      const previousMemberRatingCount = target?.member_rating_count ?? 0;

      if (currentUserId) {
        setListItems((prev) =>
          prev.map((prevItem) =>
            prevItem.id === targetId
              ? {
                  ...prevItem,
                  member_rating_count: previousMemberRatingCount + 1,
                  member_ratings: [
                    ...previousMemberRatings,
                    {
                      user: { id: currentUserId } as User,
                      score: parseFloat(data.score),
                    },
                  ] as MemberRating[],
                }
              : prevItem
          )
        );
      }

      return { previousMemberRatings, previousMemberRatingCount };
    },
    onError: (err, { itemId }, snapshot) => {
      const targetId = Number(itemId);
      setListItems((prev) =>
        prev.map((prevItem) =>
          prevItem.id === targetId
            ? {
                ...prevItem,
                member_ratings:
                  snapshot?.previousMemberRatings ??
                  (Array.isArray(prevItem.member_ratings)
                    ? prevItem.member_ratings
                    : []),
                member_rating_count:
                  snapshot?.previousMemberRatingCount ??
                  prevItem.member_rating_count,
              }
            : prevItem
        )
      );
      setError(err.message || "Failed to rate item");
    },
  });

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

  const handleToggleItemStatus = async (
    itemId: number,
    currentStatus: string
  ) => {
    const nextStatus =
      currentStatus === ItemStatus.COMPLETED
        ? ItemStatus.PENDING
        : ItemStatus.COMPLETED;

    try {
      await toggleStatusMutation.mutateAsync({ listId, itemId, nextStatus });
    } catch {
      // toast + rollback already handled inside the mutation lifecycle
    }
  };

  const handleSubmitRating = async (item: ListItem, data: RatingCreate) => {
    if (!currentUserId) return;

    try {
      await rateMutation.mutateAsync({ listId, itemId: item.id, data });
    } catch (err) {
      // surface to the modal so it stays open / can retry
      throw err;
    }
  };

  return {
    actionLoading:
      actionLoading || toggleStatusMutation.isPending || rateMutation.isPending,
    error,
    handleUpdateList,
    handleDeleteList,
    handleDeleteItem,
    handleToggleItemStatus,
    handleSubmitRating,
  };
}
