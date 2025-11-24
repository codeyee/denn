"use client";

import { useEffect } from "react";
import { Modal } from "@/app/_components/common/modals/Modal";
import { Button } from "@/app/_components/common/ui/Button";
import { useListsStore } from "@/app/_stores/lists-store";
import { ContentType, TVSeason } from "@/lib/types";
import { ListWithItems } from "@/lib/types";
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
  onSuccess?: () => void;
}

export function AddToListModal({
  isOpen,
  onOpenChange,
  contentItem,
  tvShowSeasons,
  tvShowId,
  onSuccess,
}: AddToListModalProps) {
  const {
    lists,
    isLoading: listsLoading,
    fetchLists,
  } = useListsStore();

  const isMultiSeasonShow = Boolean(tvShowSeasons && tvShowSeasons.length > 0 && tvShowId);

  const operations = useListOperations({
    contentItem,
    tvShowSeasons,
    tvShowId,
    onSuccess,
    onClose: () => onOpenChange(false)
  });

  const seasonSelection = useSeasonSelection(tvShowSeasons);

  const phases = useModalPhases({
    isMultiSeasonShow
  });

  useEffect(() => {
    if (isOpen) {
      // Optimize: Only fetch minimal fields needed for list display and duplicate checking
      fetchLists({
        items_size: 4,
        fields: "id,name,item_count,items.id,items.content_item.external_id,items.content_item.source_api,items.content_item.content_type",
      });
      operations.setError(null);
      seasonSelection.resetSelection();
      phases.resetPhases();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, fetchLists, operations.setError, seasonSelection.resetSelection, phases.resetPhases]);

  const handleClose = () => {
    if (!operations.addingToListId && !operations.creatingNewList) {
      operations.setError(null);
      phases.resetPhases();
      onOpenChange(false);
    }
  };

  const isItemInList = (list: ListWithItems): boolean => {
    if (!list.items || list.items.length === 0) return false;

    return list.items.some((item) => {
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
      showCloseButton={!operations.addingToListId && !operations.creatingNewList}
    >
      <Modal.Header
        title={phases.modalPhase === 'selection' ? "Add to List" : "Choose a List"}
        description={
          phases.modalPhase === 'selection'
            ? "How would you like to add this TV show?"
            : phases.addMode === 'seasons' && seasonSelection.selectedSeasons.size > 0
            ? `Adding ${seasonSelection.selectedSeasons.size} ${seasonSelection.selectedSeasons.size === 1 ? 'season' : 'seasons'}`
            : "Choose a list or create a new one"
        }
      />

      <Modal.Content className="space-y-4 mt-4">
        {operations.error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-md p-3">
            <p className="text-red-500 text-sm">{operations.error}</p>
          </div>
        )}

        {operations.addingProgress && (
          <div className="bg-blue-500/10 border border-blue-500/50 rounded-md p-3">
            <p className="text-blue-400 text-sm">{operations.addingProgress}</p>
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
            addingToListId={operations.addingToListId}
            creatingNewList={operations.creatingNewList}
            successListId={operations.successListId}
            addMode={phases.addMode}
            selectedSeasons={seasonSelection.selectedSeasons}
            tvShowSeasons={tvShowSeasons}
            isItemInList={isItemInList}
            getSeasonsInListCount={getSeasonsInListCount}
            handleCreateNewList={operations.handleCreateNewList}
            handleAddToList={(listId) => operations.handleAddToList(
              listId,
              phases.addMode,
              seasonSelection.selectedSeasons
            )}
          />
        )}
      </Modal.Content>

      {!operations.successListId && (
        <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6">
          {isMultiSeasonShow && phases.modalPhase === 'lists' && (
            <Button
              type="button"
              variant="outline"
              onClick={() => phases.handleBackToSelection(operations.setError)}
              disabled={operations.addingToListId !== null || operations.creatingNewList}
              className="cursor-pointer min-h-[44px]"
            >
              Back
            </Button>
          )}

          {(!isMultiSeasonShow || phases.modalPhase === 'selection') && <div className="hidden sm:block" />}

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={operations.addingToListId !== null || operations.creatingNewList}
              className="cursor-pointer min-h-[44px]"
            >
              Cancel
            </Button>

            {isMultiSeasonShow && phases.modalPhase === 'selection' && (
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
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
