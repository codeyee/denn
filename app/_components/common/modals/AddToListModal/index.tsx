"use client";

import { useEffect, useState, useCallback } from "react";
import { Modal } from "@/app/_components/common/modals/Modal";
import { Button } from "@/app/_components/common/ui/Button";
import { ContentType, TVSeason, ListItem, ListWithItems } from "@/lib/types";
import { listActions } from "@/lib/api";
import { useListOperations } from "./hooks/useListOperations";
import { useSeasonSelection } from "./hooks/useSeasonSelection";
import { useModalPhases } from "./hooks/useModalPhases";
import { SelectionPhase } from "./components/SelectionPhase";
import { ListsPhase } from "./components/ListsPhase";

interface AddToListModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  contentItem: {
    source_api: string;
    external_id: string;
    content_type: string;
  };
  tvShowSeasons?: TVSeason[];
  tvShowId?: number;
}

export function AddToListModal({
  isOpen,
  onOpenChange,
  contentItem,
  tvShowSeasons,
  tvShowId,
}: AddToListModalProps) {
  // Local state for lists (separate from global store)
  const [lists, setLists] = useState<ListWithItems[]>([]);
  const [listsLoading, setListsLoading] = useState(false);

  const isMultiSeasonShow = Boolean(tvShowSeasons && tvShowSeasons.length > 0 && tvShowId);

  // Fetch lists locally (independent of global store)
  const fetchModalLists = useCallback(async (options: {
    items_size?: number;
    fields?: string;
    filter_external_id?: string;
    filter_source_api?: string;
    filter_content_type?: string;
  }) => {
    setListsLoading(true);
    try {
      const response = await listActions.list(options);
      setLists(response.results || []);
    } catch (error) {
      console.error("Error fetching lists for modal:", error);
      setLists([]);
    } finally {
      setListsLoading(false);
    }
  }, []);

  // Refresh lists with same filters as initial fetch (used after add/remove operations)
  const refreshModalLists = useCallback(async () => {
    // Use the same filtering logic as the initial fetch
    const fetchOptions = isMultiSeasonShow
      ? {
        items_size: 100,
        fields: "id,name,item_count,list_type,items.id,items.content_item.external_id,items.content_item.source_api,items.content_item.content_type",
      }
      : {
        items_size: 100,
        fields: "id,name,item_count,list_type,items.id,items.content_item.external_id,items.content_item.source_api,items.content_item.content_type",
        filter_external_id: contentItem.external_id,
        filter_source_api: contentItem.source_api,
        filter_content_type: contentItem.content_type,
      };

    await fetchModalLists(fetchOptions);
  }, [fetchModalLists, isMultiSeasonShow, contentItem.external_id, contentItem.source_api, contentItem.content_type]);

  const operations = useListOperations({
    contentItem,
    tvShowSeasons,
    tvShowId,
    refreshLists: refreshModalLists,
  });

  const seasonSelection = useSeasonSelection(tvShowSeasons);

  const phases = useModalPhases({
    isMultiSeasonShow
  });

  useEffect(() => {
    if (isOpen) {
      // Use backend filtering only for non-season content
      // For TV shows with seasons, we need to check multiple season external_ids,
      // so we fetch all items and filter in JavaScript
      const fetchOptions = isMultiSeasonShow
        ? {
          items_size: 100,
          fields: "id,name,item_count,list_type,items.id,items.content_item.external_id,items.content_item.source_api,items.content_item.content_type",
        }
        : {
          items_size: 100,
          fields: "id,name,item_count,list_type,items.id,items.content_item.external_id,items.content_item.source_api,items.content_item.content_type",
          filter_external_id: contentItem.external_id,
          filter_source_api: contentItem.source_api,
          filter_content_type: contentItem.content_type,
        };

      // Fetch lists locally (doesn't affect global store)
      fetchModalLists(fetchOptions);
      operations.setError(null);
      seasonSelection.resetSelection();
      phases.resetPhases();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, contentItem.external_id, contentItem.source_api, contentItem.content_type, isMultiSeasonShow]);

  const handleClose = () => {
    if (!operations.creatingNewList) {
      operations.setError(null);
      phases.resetPhases();
      onOpenChange(false);
      // No need to refresh global store - modal uses local state only
    }
  };

  const getItemInList = (list: ListWithItems): ListItem | undefined => {
    if (!list.items || list.items.length === 0) return undefined;

    // Always filter in JavaScript since we refresh without filters after operations
    return list.items.find((item) => {
      const itemContentItem = item.content_item;
      return (
        itemContentItem.external_id === contentItem.external_id &&
        itemContentItem.source_api === contentItem.source_api &&
        itemContentItem.content_type === contentItem.content_type
      );
    });
  };

  const isSeasonInList = (list: ListWithItems, seasonNumber: number): boolean => {
    if (!list.items || list.items.length === 0 || !tvShowId) return false;

    const seasonExternalId = `${tvShowId}:${seasonNumber}`;
    return list.items.some((item) => {
      const itemContentItem = item.content_item;
      return (
        itemContentItem.external_id === seasonExternalId &&
        itemContentItem.source_api === contentItem.source_api &&
        itemContentItem.content_type === ContentType.SEASON
      );
    });
  };

  const getSeasonsInListCount = (list: ListWithItems): number => {
    if (!tvShowSeasons || !list.items) return 0;
    return tvShowSeasons.filter(season => isSeasonInList(list, season.season_number)).length;
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={handleClose}
      showCloseButton={!operations.creatingNewList}
    >
      <Modal.Header
        title={phases.modalPhase === 'selection' ? "Add to List" : "Add to Lists"}
        description={
          phases.modalPhase === 'selection'
            ? "How would you like to add this TV show?"
            : phases.addMode === 'seasons' && seasonSelection.selectedSeasons.size > 0
              ? `Adding ${seasonSelection.selectedSeasons.size} ${seasonSelection.selectedSeasons.size === 1 ? 'season' : 'seasons'}`
              : "Select lists to add this item to"
        }
      />

      <Modal.Content className="space-y-4 mt-4">
        {operations.error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-md p-3">
            <p className="text-red-500 text-sm">{operations.error}</p>
          </div>
        )}

        {isMultiSeasonShow && phases.modalPhase === 'selection' && (
          <SelectionPhase
            addMode={phases.addMode}
            setAddMode={phases.setAddMode}
            tvShowSeasons={tvShowSeasons!}
            selectedSeasons={seasonSelection.selectedSeasons}
            toggleSeason={seasonSelection.toggleSeason}
            selectAllSeasons={seasonSelection.selectAllSeasons}
            deselectAllSeasons={seasonSelection.deselectAllSeasons}
            lists={lists as ListWithItems[]}
            isSeasonInList={isSeasonInList}
          />
        )}

        {phases.modalPhase === 'lists' && (
          <ListsPhase
            lists={lists as ListWithItems[]}
            listsLoading={listsLoading}
            loadingListIds={operations.loadingListIds}
            creatingNewList={operations.creatingNewList}
            addMode={phases.addMode}
            selectedSeasons={seasonSelection.selectedSeasons}
            tvShowSeasons={tvShowSeasons}
            getItemInList={getItemInList}
            getSeasonsInListCount={getSeasonsInListCount}
            handleCreateNewList={operations.handleCreateNewList}
            handleToggleList={(listId, checked, existingItemId) => operations.handleToggleList(
              listId,
              checked,
              phases.addMode,
              seasonSelection.selectedSeasons,
              existingItemId
            )}
          />
        )}
      </Modal.Content>

      <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6">
        {isMultiSeasonShow && phases.modalPhase === 'lists' && (
          <Button
            type="button"
            variant="outline"
            onClick={() => phases.handleBackToSelection(operations.setError)}
            disabled={operations.creatingNewList}
            className="cursor-pointer min-h-[44px]"
          >
            Back
          </Button>
        )}

        {(!isMultiSeasonShow || phases.modalPhase === 'selection') && <div className="hidden sm:block" />}

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {isMultiSeasonShow && phases.modalPhase === 'selection' ? (
            <Button
              type="button"
              onClick={() => phases.handleContinueToLists(
                phases.addMode,
                seasonSelection.selectedSeasons.size,
                operations.setError
              )}
              disabled={phases.addMode === 'seasons' && seasonSelection.selectedSeasons.size === 0}
              className="cursor-pointer min-h-[44px]"
            >
              Continue
            </Button>
          ) : (
            // No "Add" or "Cancel" buttons in Lists phase, just Close (X) or click outside
            // But we might want a "Done" button for mobile or clarity?
            // Prompt says: "Closes on click X/DONE or outside modal."
            // So maybe a "Done" button is good.
            <Button
              type="button"
              variant="default"
              onClick={handleClose}
              disabled={operations.creatingNewList}
              className="cursor-pointer min-h-[44px]"
            >
              Done
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
