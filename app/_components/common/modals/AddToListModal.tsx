"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Modal from "@/app/_components/common/modals/Modal";
import { Button } from "@/app/_components/lib/button";
import { useListsStore } from "@/app/_stores/lists-store";
import { listItemActions } from "@/lib/api";
import { ListItemCreate, ContentType, SourceApi, TVSeason } from "@/lib/api/types";
import { ListWithItems } from "@/types";
import { Plus, Check } from "lucide-react";

interface AddToListModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  contentItem: {
    source_api: string;
    external_id: string;
    content_type: string;
  };
  tvShowSeasons?: TVSeason[];  // Array of seasons if content is multi-season TV show
  tvShowId?: number;            // TV show ID for season external_id formatting
  onSuccess?: () => void;
}

export default function AddToListModal({
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
    createList,
    forceRefreshLists,
  } = useListsStore();
  const [addingToListId, setAddingToListId] = useState<number | null>(null);
  const [creatingNewList, setCreatingNewList] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successListId, setSuccessListId] = useState<number | null>(null);

  // TV Show season selection state
  const [addMode, setAddMode] = useState<'show' | 'seasons'>('show');
  const [selectedSeasons, setSelectedSeasons] = useState<Set<number>>(new Set());
  const [addingProgress, setAddingProgress] = useState<string | null>(null);
  const [modalPhase, setModalPhase] = useState<'selection' | 'lists'>('selection');

  // Check if this is a TV show with season data
  const isMultiSeasonShow = tvShowSeasons && tvShowSeasons.length > 0 && tvShowId;

  // Fetch lists and reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      // Fetch lists with 4 items to check if content is already in list
      fetchLists({ items_size: 4 });
      setError(null);
      setSuccessListId(null);
      setAddMode('show');
      setSelectedSeasons(new Set());
      setAddingProgress(null);
      setModalPhase(isMultiSeasonShow ? 'selection' : 'lists');
    }
  }, [isOpen, fetchLists, isMultiSeasonShow]);

  const handleCreateNewList = async () => {
    setCreatingNewList(true);
    setError(null);

    try {
      // Create list with timestamp name
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, -5);
      const newList = await createList(`List ${timestamp}`);

      // Add item to the newly created list
      await listItemActions.create(newList.id, {
        source_api: contentItem.source_api as SourceApi,
        external_id: contentItem.external_id,
        content_type: contentItem.content_type as ContentType,
        status: "PENDING",
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
      // If adding individual seasons
      if (addMode === 'seasons' && selectedSeasons.size > 0 && tvShowId) {
        await addSeasonsToList(listId, Array.from(selectedSeasons));
      } else {
        // Add regular content (TV show or other content type)
        await listItemActions.create(listId, {
          source_api: contentItem.source_api as SourceApi,
          external_id: contentItem.external_id,
          content_type: contentItem.content_type as ContentType,
          status: "PENDING",
        } as ListItemCreate);
      }

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
      const errorMessage =
        err instanceof Error ? err.message : "Failed to add to list";

      // Check if it's a duplicate error
      if (
        errorMessage.toLowerCase().includes("already") ||
        errorMessage.toLowerCase().includes("duplicate")
      ) {
        setError("This item is already in the list");
        // Refresh lists to update the UI
        await forceRefreshLists({ items_size: 4 });
      } else {
        setError(errorMessage);
      }
    } finally {
      setAddingToListId(null);
      setAddingProgress(null);
    }
  };

  const addSeasonsToList = async (listId: number, seasonNumbers: number[]) => {
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

    // Handle results
    if (failedSeasons.length === 0) {
      // All succeeded
      setAddingProgress(`Successfully added ${addedSeasons.length} ${addedSeasons.length === 1 ? 'season' : 'seasons'}!`);
    } else if (addedSeasons.length === 0) {
      // All failed
      throw new Error(`Failed to add seasons: ${failedSeasons.map(f => `Season ${f.seasonNumber}`).join(', ')}`);
    } else {
      // Partial success
      setAddingProgress(`Added ${addedSeasons.length} seasons. ${failedSeasons.length} failed.`);
      setError(`Some seasons could not be added: ${failedSeasons.map(f => `Season ${f.seasonNumber}`).join(', ')}`);
    }
  };

  const handleClose = () => {
    if (!addingToListId && !creatingNewList) {
      setError(null);
      setSuccessListId(null);
      setModalPhase(isMultiSeasonShow ? 'selection' : 'lists');
      onOpenChange(false);
    }
  };

  const handleContinueToLists = () => {
    // Validate selection before continuing
    if (addMode === 'seasons' && selectedSeasons.size === 0) {
      setError("Please select at least one season to continue");
      return;
    }
    setError(null);
    setModalPhase('lists');
  };

  const handleBackToSelection = () => {
    setError(null);
    setModalPhase('selection');
  };

  // Check if content item is already in a list
  const isItemInList = (list: ListWithItems): boolean => {
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

  // Check if a specific season is already in a list
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

  // Get count of seasons already in a list
  const getSeasonsInListCount = (list: ListWithItems): number => {
    if (!tvShowSeasons || !list.items) return 0;
    return tvShowSeasons.filter(season => isSeasonInList(list, season.season_number)).length;
  };

  // Toggle season selection
  const toggleSeason = (seasonNumber: number) => {
    const newSelected = new Set(selectedSeasons);
    if (newSelected.has(seasonNumber)) {
      newSelected.delete(seasonNumber);
    } else {
      newSelected.add(seasonNumber);
    }
    setSelectedSeasons(newSelected);
  };

  // Select/Deselect all seasons
  const selectAllSeasons = () => {
    if (tvShowSeasons) {
      setSelectedSeasons(new Set(tvShowSeasons.map(s => s.season_number)));
    }
  };

  const deselectAllSeasons = () => {
    setSelectedSeasons(new Set());
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={handleClose}
      showCloseButton={!addingToListId && !creatingNewList}
    >
      <Modal.Header
        title={modalPhase === 'selection' ? "Add to List" : "Choose a List"}
        description={
          modalPhase === 'selection'
            ? "How would you like to add this TV show?"
            : addMode === 'seasons' && selectedSeasons.size > 0
            ? `Adding ${selectedSeasons.size} ${selectedSeasons.size === 1 ? 'season' : 'seasons'}`
            : "Choose a list or create a new one"
        }
      />

      <Modal.Content className="space-y-4 mt-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-md p-3">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        {/* Progress indicator for multi-season addition */}
        {addingProgress && (
          <div className="bg-blue-500/10 border border-blue-500/50 rounded-md p-3">
            <p className="text-blue-400 text-sm">{addingProgress}</p>
          </div>
        )}

        {/* PHASE 1: Mode Selection (only for TV shows with seasons) */}
        {isMultiSeasonShow && modalPhase === 'selection' && (
          <div className="space-y-4">
            {/* Radio buttons for add mode */}
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-4 rounded-lg border-2 border-white/10 hover:bg-white/5 hover:border-white/20 cursor-pointer transition-all">
                <input
                  type="radio"
                  name="addMode"
                  value="show"
                  checked={addMode === 'show'}
                  onChange={() => setAddMode('show')}
                  className="mt-1 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="font-semibold text-white text-base">Add TV Show</div>
                  <div className="text-sm text-white/60 mt-1">Add the complete TV show as a single item to track and rate the series as a whole</div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 rounded-lg border-2 border-white/10 hover:bg-white/5 hover:border-white/20 cursor-pointer transition-all">
                <input
                  type="radio"
                  name="addMode"
                  value="seasons"
                  checked={addMode === 'seasons'}
                  onChange={() => setAddMode('seasons')}
                  className="mt-1 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="font-semibold text-white text-base">Add Individual Seasons</div>
                  <div className="text-sm text-white/60 mt-1">Choose specific seasons to track and rate individually for more granular management</div>
                </div>
              </label>
            </div>

            {/* Season selection preview (shown when 'seasons' mode is selected) */}
            {addMode === 'seasons' && tvShowSeasons && (
              <div className="mt-4 space-y-3 p-4 border border-white/10 rounded-lg bg-white/5">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white">Select Seasons ({selectedSeasons.size}/{tvShowSeasons.length} selected)</h4>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllSeasons}
                      className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer transition-colors font-medium"
                    >
                      Select All
                    </button>
                    <span className="text-white/30">•</span>
                    <button
                      type="button"
                      onClick={deselectAllSeasons}
                      className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer transition-colors font-medium"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="max-h-[350px] overflow-y-auto space-y-2 pr-2">
                  {tvShowSeasons.map((season) => {
                    const isSelected = selectedSeasons.has(season.season_number);
                    // Check if this season exists in any list
                    const inAnyList = lists.some(list => isSeasonInList(list, season.season_number));

                    return (
                      <label
                        key={season.season_number}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-500/50 bg-blue-500/10'
                            : 'border-white/10 hover:bg-white/5'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSeason(season.season_number)}
                          className="cursor-pointer"
                        />
                        {season.image_url && (
                          <div className="relative w-14 h-20 shrink-0 rounded overflow-hidden bg-gray-800">
                            <Image
                              src={season.image_url}
                              alt={season.title || `Season ${season.season_number}`}
                              fill
                              className="object-cover"
                              sizes="56px"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-semibold text-white truncate">
                              {season.title || `Season ${season.season_number}`}
                            </div>
                            {inAnyList && (
                              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-sans shrink-0">
                                In list
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-white/60 mt-0.5">
                            {season.number_of_episodes} {season.number_of_episodes === 1 ? 'episode' : 'episodes'}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PHASE 2: List Selection (shown after mode selection or immediately for non-TV content) */}
        {modalPhase === 'lists' && (
          <>
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
              {(lists as ListWithItems[]).map((list: ListWithItems) => {
                const alreadyInList = isItemInList(list);
                const itemCount = list.item_count
                  ? parseInt(list.item_count, 10)
                  : 0;

                // For season mode, check how many seasons are already in the list
                const seasonsInListCount = addMode === 'seasons' ? getSeasonsInListCount(list) : 0;
                const allSeasonsInList = addMode === 'seasons' && tvShowSeasons &&
                  seasonsInListCount === tvShowSeasons.length;

                // Disable conditions
                const shouldDisable = addingToListId !== null ||
                  creatingNewList ||
                  successListId === list.id ||
                  (addMode === 'show' && alreadyInList) ||
                  (addMode === 'seasons' && selectedSeasons.size === 0);

                return (
                  <button
                    key={list.id}
                    onClick={() => handleAddToList(list.id)}
                    disabled={shouldDisable}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      successListId === list.id
                        ? "bg-green-500/20 border-green-500/50"
                        : alreadyInList && addMode === 'show'
                        ? "bg-blue-500/10 border-blue-500/50 cursor-not-allowed"
                        : "bg-card border-border hover:bg-card/80 hover:border-white/30 cursor-pointer"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-white truncate">
                            {list.name}
                          </p>
                          {alreadyInList && addMode === 'show' && (
                            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-sans shrink-0">
                              Already added
                            </span>
                          )}
                          {addMode === 'seasons' && seasonsInListCount > 0 && (
                            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-sans shrink-0">
                              {seasonsInListCount} {seasonsInListCount === 1 ? 'season' : 'seasons'} in list
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
                      ) : (alreadyInList && addMode === 'show') || allSeasonsInList ? (
                        <Check className="w-5 h-5 text-blue-400 ml-3 shrink-0" />
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
          </>
        )}
      </Modal.Content>

      {!successListId && (
        <div className="flex justify-between gap-3 mt-6">
          {/* Back button (only in lists phase for TV shows) */}
          {isMultiSeasonShow && modalPhase === 'lists' && (
            <Button
              type="button"
              variant="outline"
              onClick={handleBackToSelection}
              disabled={addingToListId !== null || creatingNewList}
              className="cursor-pointer"
            >
              Back
            </Button>
          )}

          {/* Spacer for alignment when no back button */}
          {(!isMultiSeasonShow || modalPhase === 'selection') && <div />}

          {/* Right side buttons */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={addingToListId !== null || creatingNewList}
              className="cursor-pointer"
            >
              Cancel
            </Button>

            {/* Continue button (only in selection phase) */}
            {isMultiSeasonShow && modalPhase === 'selection' && (
              <Button
                type="button"
                onClick={handleContinueToLists}
                disabled={addMode === 'seasons' && selectedSeasons.size === 0}
                className="cursor-pointer"
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
