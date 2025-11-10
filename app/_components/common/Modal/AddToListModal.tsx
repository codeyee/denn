"use client";

import { useState, useEffect } from "react";
import Modal from "@/app/_components/common/Modal";
import { Button } from "@/app/_components/lib/button";
import { useListsStore } from "@/app/_stores/lists-store";
import { listItemActions, listActions } from "@/lib/api";
import { ListItemCreate } from "@/lib/api/types";
import { List } from "@/types/contentTypes";
import { Plus, Check } from "lucide-react";

interface AddToListModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  contentItem: {
    source_api: string;
    external_id: string;
    content_type: string;
  };
  onSuccess?: () => void;
}

export default function AddToListModal({
  isOpen,
  onOpenChange,
  contentItem,
  onSuccess,
}: AddToListModalProps) {
  const { lists, isLoading: listsLoading, fetchLists, createList, forceRefreshLists } = useListsStore();
  const [addingToListId, setAddingToListId] = useState<number | null>(null);
  const [creatingNewList, setCreatingNewList] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successListId, setSuccessListId] = useState<number | null>(null);
  const [listStats, setListStats] = useState<Map<number, { total_items: number }>>(new Map());
  const [fetchingStats, setFetchingStats] = useState(false);

  // Fetch lists when modal opens
  useEffect(() => {
    if (isOpen) {
      // Fetch lists with 4 items to check if content is already in list
      fetchLists({ items_size: 4 });
      setError(null);
      setSuccessListId(null);
    }
  }, [isOpen, fetchLists]);

  // Fetch stats for all lists
  useEffect(() => {
    const fetchStatsForLists = async () => {
      if (!isOpen || lists.length === 0) return;

      setFetchingStats(true);
      const statsMap = new Map<number, { total_items: number }>();

      try {
        // Fetch stats for all lists in parallel
        const statsPromises = lists.map(async (list) => {
          try {
            const stats = await listActions.getStats(list.id) as any;
            return { id: list.id, stats };
          } catch (err) {
            console.error(`Failed to fetch stats for list ${list.id}:`, err);
            return { id: list.id, stats: null };
          }
        });

        const results = await Promise.all(statsPromises);

        results.forEach(({ id, stats }) => {
          if (stats && typeof stats.total_items === 'number') {
            statsMap.set(id, { total_items: stats.total_items });
          }
        });

        setListStats(statsMap);
      } catch (err) {
        console.error("Error fetching list stats:", err);
      } finally {
        setFetchingStats(false);
      }
    };

    fetchStatsForLists();
  }, [isOpen, lists]);

  const handleCreateNewList = async () => {
    setCreatingNewList(true);
    setError(null);

    try {
      // Create list with timestamp name
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
      const newList = await createList(`List ${timestamp}`);

      // Add item to the newly created list
      await listItemActions.create(newList.id, {
        source_api: contentItem.source_api,
        external_id: contentItem.external_id,
        content_type: contentItem.content_type,
      } as ListItemCreate);

      // Force refresh lists to show updated data on homepage
      await forceRefreshLists({ items_size: 4 });

      setSuccessListId(newList.id);

      // Call success callback and close modal after a brief delay
      setTimeout(() => {
        onSuccess?.();
        onOpenChange(false);
      }, 1500);
    } catch (err) {
      console.error("Error creating new list:", err);
      setError(err instanceof Error ? err.message : "Failed to create list");
    } finally {
      setCreatingNewList(false);
    }
  };

  const handleAddToList = async (listId: number) => {
    setAddingToListId(listId);
    setError(null);

    try {
      await listItemActions.create(listId, {
        source_api: contentItem.source_api,
        external_id: contentItem.external_id,
        content_type: contentItem.content_type,
      } as ListItemCreate);

      // Force refresh lists to show updated data on homepage
      await forceRefreshLists({ items_size: 4 });

      setSuccessListId(listId);

      // Call success callback and close modal after a brief delay
      setTimeout(() => {
        onSuccess?.();
        onOpenChange(false);
      }, 1500);
    } catch (err) {
      console.error("Error adding to list:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to add to list";

      // Check if it's a duplicate error
      if (errorMessage.toLowerCase().includes("already") || errorMessage.toLowerCase().includes("duplicate")) {
        setError("This item is already in the list");
        // Refresh lists to update the UI
        await forceRefreshLists({ items_size: 4 });
      } else {
        setError(errorMessage);
      }
    } finally {
      setAddingToListId(null);
    }
  };

  const handleClose = () => {
    if (!addingToListId && !creatingNewList) {
      setError(null);
      setSuccessListId(null);
      onOpenChange(false);
    }
  };

  // Check if content item is already in a list
  const isItemInList = (list: List): boolean => {
    if (!list.items || list.items.length === 0) return false;

    return list.items.some((item) => {
      // Check if the list item's content_item matches our contentItem
      const itemContentItem = item.content_item;
      return (
        itemContentItem.external_id === contentItem.external_id &&
        itemContentItem.source_api === contentItem.source_api &&
        itemContentItem.content_type === contentItem.content_type
      );
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={handleClose}
      showCloseButton={!addingToListId && !creatingNewList}
    >
      <Modal.Header
        title="Add to List"
        description="Choose a list or create a new one"
      />

      <Modal.Content className="space-y-4 mt-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-md p-3">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        {/* Create New List Button */}
        <Button
          onClick={handleCreateNewList}
          disabled={creatingNewList || addingToListId !== null}
          className="w-full flex items-center justify-center gap-2 cursor-pointer"
          variant="default"
        >
          {creatingNewList ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Creating List...
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              Create New List
            </>
          )}
        </Button>

        {/* Lists Section */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-white/80">Your Lists</h3>

          {listsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : lists.length === 0 ? (
            <div className="text-center py-8 text-white/60">
              <p className="text-sm">You don't have any lists yet.</p>
              <p className="text-sm">Create one to get started!</p>
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
              {lists.map((list: List) => {
                const alreadyInList = isItemInList(list);
                // Use stats from API if available, otherwise fallback to cached data
                const stats = listStats.get(list.id);
                const itemCount = stats?.total_items ?? (list.item_count ? parseInt(list.item_count, 10) : 0);

                return (
                  <button
                    key={list.id}
                    onClick={() => handleAddToList(list.id)}
                    disabled={addingToListId !== null || creatingNewList || successListId === list.id || alreadyInList}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      successListId === list.id
                        ? "bg-green-500/20 border-green-500/50"
                        : alreadyInList
                        ? "bg-blue-500/10 border-blue-500/50 cursor-not-allowed"
                        : "bg-card border-border hover:bg-card/80 hover:border-white/30 cursor-pointer"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-white truncate">{list.name}</p>
                          {alreadyInList && (
                            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-sans shrink-0">
                              Already added
                            </span>
                          )}
                        </div>
                        {list.description && (
                          <p className="text-sm text-white/60 truncate font-sans">
                            {list.description}
                          </p>
                        )}
                        {itemCount > 0 && (
                          <p className="text-xs text-white/50 mt-1 font-sans">
                            {itemCount} {itemCount === 1 ? "item" : "items"}
                          </p>
                        )}
                      </div>
                      {addingToListId === list.id ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white ml-3"></div>
                      ) : successListId === list.id ? (
                        <Check className="w-5 h-5 text-green-500 ml-3 shrink-0" />
                      ) : alreadyInList ? (
                        <Check className="w-5 h-5 text-blue-400 ml-3 shrink-0" />
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Modal.Content>

      {!successListId && (
        <div className="flex justify-end gap-3 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={addingToListId !== null || creatingNewList}
            className="cursor-pointer"
          >
            Cancel
          </Button>
        </div>
      )}
    </Modal>
  );
}
