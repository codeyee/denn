
import { useEffect, useMemo } from "react";
import { Modal } from "@/components/common/modals/Modal";
import { Button } from "@/components/common/ui/Button";
import { ContentType, TVSeason, UserListWithMatches, BulkCheckItem, MatchedItem, TVShowDetail } from "@/lib/types";
import { useListOperations } from "./hooks/useListOperations";
import { useSeasonSelection } from "./hooks/useSeasonSelection";
import { useModalPhases } from "./hooks/useModalPhases";
import { SelectionPhase } from "./components/SelectionPhase";
import { ListsPhase } from "./components/ListsPhase";
import {
  useBulkListMembershipQuery,
  useContentItemResolutionQuery,
} from "@/lib/api/queries";

interface AddToListModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  contentItem: {
    source_api: string;
    external_id: string;
    content_type: string;
  };
  tvShowSeasons?: TVSeason[];
  tvShowId?: string;
}

export function AddToListModal({
  isOpen,
  onOpenChange,
  contentItem,
  tvShowSeasons,
  tvShowId,
}: AddToListModalProps) {
  const needsTvShowContent =
    isOpen &&
    contentItem.content_type === ContentType.TV_SHOW &&
    (!tvShowSeasons || tvShowSeasons.length === 0);
  const fetchedContent = useContentItemResolutionQuery(
    contentItem.external_id,
    contentItem.content_type as ContentType,
    { enabled: needsTvShowContent },
  );
  const fetchedContentItem = fetchedContent.data ?? null;
  const loadingContent = fetchedContent.isLoading;

  // Determine effective data (props or fetched)
  const effectiveSeasons = useMemo(() => (tvShowSeasons && tvShowSeasons.length > 0)
    ? tvShowSeasons
    : (fetchedContentItem?.source_data as unknown as TVShowDetail)?.seasons || [], [tvShowSeasons, fetchedContentItem]);

  const effectiveTvShowId = useMemo(() => tvShowId || fetchedContentItem?.external_id, [tvShowId, fetchedContentItem]);

  const isMultiSeasonShow = Boolean(effectiveSeasons && effectiveSeasons.length > 0 && effectiveTvShowId);

  const membershipItems = useMemo<BulkCheckItem[]>(() => {
    const items: BulkCheckItem[] = [{
      external_id: contentItem.external_id,
      source_api: contentItem.source_api,
      content_type: contentItem.content_type,
    }];

    if (isMultiSeasonShow && effectiveSeasons && effectiveTvShowId) {
      const seasonItems = effectiveSeasons.map(season => ({
        external_id: `${effectiveTvShowId}:${season.season_number}`,
        source_api: contentItem.source_api,
        content_type: ContentType.SEASON,
      }));
      items.push(...seasonItems);
    }

    return items;
  }, [isMultiSeasonShow, effectiveSeasons, effectiveTvShowId, contentItem]);

  const membershipQuery = useBulkListMembershipQuery(membershipItems, {
    enabled: isOpen && !loadingContent,
  });
  const lists = membershipQuery.data?.lists ?? [];
  const listsLoading = membershipQuery.isLoading || membershipQuery.isFetching;

  const operations = useListOperations({
    contentItem,
    tvShowSeasons: effectiveSeasons,
    tvShowId: effectiveTvShowId,
    refreshLists: async () => {
      await membershipQuery.refetch();
    },
  });

  const seasonSelection = useSeasonSelection(effectiveSeasons);

  const phases = useModalPhases({
    isMultiSeasonShow
  });

  useEffect(() => {
    if (isOpen) {
      operations.setError(null);
      seasonSelection.resetSelection();
      phases.resetPhases();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, contentItem.external_id, contentItem.source_api, contentItem.content_type, isMultiSeasonShow, effectiveSeasons, effectiveTvShowId]);

  const handleClose = () => {
    if (!operations.creatingNewList) {
      operations.setError(null);
      phases.resetPhases();
      onOpenChange(false);
      // No need to refresh global store - modal uses local state only
    }
  };

  const getItemInList = (list: UserListWithMatches): MatchedItem | undefined => {
    if (!list.matched_items || list.matched_items.length === 0) return undefined;

    return list.matched_items.find((item) => {
      return (
        item.external_id === contentItem.external_id &&
        item.source_api === contentItem.source_api &&
        item.content_type === contentItem.content_type
      );
    });
  };

  const isSeasonInList = (list: UserListWithMatches, seasonNumber: number): boolean => {
    if (!list.matched_items || list.matched_items.length === 0 || !effectiveTvShowId) return false;

    const seasonExternalId = `${effectiveTvShowId}:${seasonNumber}`;
    return list.matched_items.some((item) => {
      return (
        item.external_id === seasonExternalId &&
        item.source_api === contentItem.source_api &&
        item.content_type === ContentType.SEASON
      );
    });
  };

  const getSeasonsInListCount = (list: UserListWithMatches, selectedSeasons?: Set<number>): number => {
    if (!effectiveSeasons || !list.matched_items) return 0;

    const seasonsToCheck = selectedSeasons
      ? effectiveSeasons.filter(s => selectedSeasons.has(s.season_number))
      : effectiveSeasons;

    return seasonsToCheck.filter(season => isSeasonInList(list, season.season_number)).length;
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

        {loadingContent && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}

        {!loadingContent && isMultiSeasonShow && phases.modalPhase === 'selection' && (
          <SelectionPhase
            addMode={phases.addMode}
            setAddMode={phases.setAddMode}
            tvShowSeasons={effectiveSeasons}
            selectedSeasons={seasonSelection.selectedSeasons}
            toggleSeason={seasonSelection.toggleSeason}
            selectAllSeasons={seasonSelection.selectAllSeasons}
            deselectAllSeasons={seasonSelection.deselectAllSeasons}
            lists={lists}
            isSeasonInList={isSeasonInList}
          />
        )}

        {!loadingContent && phases.modalPhase === 'lists' && (
          <ListsPhase
            lists={lists}
            listsLoading={listsLoading}
            loadingListIds={operations.loadingListIds}
            creatingNewList={operations.creatingNewList}
            addMode={phases.addMode}
            selectedSeasons={seasonSelection.selectedSeasons}
            getItemInList={getItemInList}
            getSeasonsInListCount={getSeasonsInListCount}
            handleCreateNewList={operations.handleCreateNewList}
            handleToggleList={(listId, checked) => {
              const list = lists.find(l => l.id === listId);
              let existingSeasonsInList: Set<number> | undefined;

              if (phases.addMode === 'seasons' && list && effectiveTvShowId) {
                existingSeasonsInList = new Set();
                list.matched_items.forEach(item => {
                  if (item.content_type === ContentType.SEASON && item.source_api === contentItem.source_api) {
                    const parts = item.external_id.split(':');
                    if (parts.length === 2 && parts[0] === String(effectiveTvShowId)) {
                      existingSeasonsInList!.add(parseInt(parts[1], 10));
                    }
                  }
                });
              }

              const existingItem = list ? getItemInList(list) : undefined;

              operations.handleToggleList(
                listId,
                checked,
                phases.addMode,
                seasonSelection.selectedSeasons,
                existingItem?.list_item_id,
                existingSeasonsInList
              );
            }}
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
