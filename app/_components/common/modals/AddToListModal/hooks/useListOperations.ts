import { useState, useCallback } from "react";
import { useListsStore } from "@/app/_stores/lists-store";
import { listItemActions } from "@/lib/api";
import { ListItemCreate, ContentType, SourceApi, TVSeason } from "@/lib/types";

interface UseListOperationsParams {
  contentItem: {
    source_api: string;
    external_id: string;
    content_type: string;
  };
  tvShowSeasons?: TVSeason[];
  tvShowId?: number;
  onSuccess?: () => void;
  onClose: () => void;
}

interface UseListOperationsReturn {
  addingToListId: number | null;
  creatingNewList: boolean;
  error: string | null;
  successListId: number | null;
  addingProgress: string | null;
  setError: (error: string | null) => void;
  handleCreateNewList: () => Promise<void>;
  handleAddToList: (listId: number, addMode: 'show' | 'seasons', selectedSeasons: Set<number>) => Promise<void>;
}

export function useListOperations({
  contentItem,
  tvShowSeasons,
  tvShowId,
  onSuccess,
  onClose
}: UseListOperationsParams): UseListOperationsReturn {
  const { createList, forceRefreshLists } = useListsStore();
  const [addingToListId, setAddingToListId] = useState<number | null>(null);
  const [creatingNewList, setCreatingNewList] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successListId, setSuccessListId] = useState<number | null>(null);
  const [addingProgress, setAddingProgress] = useState<string | null>(null);

  const handleCreateNewList = useCallback(async () => {
    setCreatingNewList(true);
    setError(null);

    try {
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, -5);
      const newList = await createList(`List ${timestamp}`);

      await listItemActions.create(newList.id, {
        source_api: contentItem.source_api as SourceApi,
        external_id: contentItem.external_id,
        content_type: contentItem.content_type as ContentType,
        status: "PENDING",
      } as ListItemCreate);

      await forceRefreshLists({ items_size: 4 });

      setSuccessListId(newList.id);

      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Error creating new list:", err);
      setError(err instanceof Error ? err.message : "Failed to create list");
    } finally {
      setCreatingNewList(false);
    }
  }, [contentItem, createList, forceRefreshLists, onSuccess, onClose]);

  const addSeasonsToList = useCallback(async (listId: number, seasonNumbers: number[]) => {
    const addedSeasons: number[] = [];
    const failedSeasons: Array<{ seasonNumber: number; error: string }> = [];

    for (let i = 0; i < seasonNumbers.length; i++) {
      const seasonNumber = seasonNumbers[i];
      const season = tvShowSeasons?.find(s => s.season_number === seasonNumber);

      if (!season) continue;

      try {
        setAddingProgress(`Adding ${season.title || `Season ${seasonNumber}`} (${i + 1}/${seasonNumbers.length})...`);

        await listItemActions.create(listId, {
          source_api: contentItem.source_api as SourceApi,
          external_id: `${tvShowId}:${seasonNumber}`,
          content_type: ContentType.SEASON,
          status: "PENDING",
        } as ListItemCreate);

        addedSeasons.push(seasonNumber);
      } catch (err) {
        console.error(`Error adding season ${seasonNumber}:`, err);
        const errorMessage = err instanceof Error ? err.message : "Failed to add season";
        failedSeasons.push({ seasonNumber, error: errorMessage });
      }
    }

    if (failedSeasons.length === 0) {
      setAddingProgress(`Successfully added ${addedSeasons.length} ${addedSeasons.length === 1 ? 'season' : 'seasons'}!`);
    } else if (addedSeasons.length === 0) {
      throw new Error(`Failed to add seasons: ${failedSeasons.map(f => `Season ${f.seasonNumber}`).join(', ')}`);
    } else {
      setAddingProgress(`Added ${addedSeasons.length} seasons. ${failedSeasons.length} failed.`);
      setError(`Some seasons could not be added: ${failedSeasons.map(f => `Season ${f.seasonNumber}`).join(', ')}`);
    }
  }, [tvShowSeasons, tvShowId, contentItem]);

  const handleAddToList = useCallback(async (
    listId: number,
    addMode: 'show' | 'seasons',
    selectedSeasons: Set<number>
  ) => {
    setAddingToListId(listId);
    setError(null);

    try {
      if (addMode === 'seasons' && selectedSeasons.size > 0 && tvShowId) {
        await addSeasonsToList(listId, Array.from(selectedSeasons));
      } else {
        await listItemActions.create(listId, {
          source_api: contentItem.source_api as SourceApi,
          external_id: contentItem.external_id,
          content_type: contentItem.content_type as ContentType,
          status: "PENDING",
        } as ListItemCreate);
      }

      await forceRefreshLists({ items_size: 4 });

      setSuccessListId(listId);

      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Error adding to list:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to add to list";

      if (
        errorMessage.toLowerCase().includes("already") ||
        errorMessage.toLowerCase().includes("duplicate")
      ) {
        setError("This item is already in the list");
        await forceRefreshLists({ items_size: 4 });
      } else {
        setError(errorMessage);
      }
    } finally {
      setAddingToListId(null);
      setAddingProgress(null);
    }
  }, [contentItem, tvShowId, addSeasonsToList, forceRefreshLists, onSuccess, onClose]);

  return {
    addingToListId,
    creatingNewList,
    error,
    successListId,
    addingProgress,
    setError,
    handleCreateNewList,
    handleAddToList
  };
}
