import { Button } from "@/app/_components/common/ui/Button";
import { ListWithItems } from "@/types";
import { Plus, Check } from "lucide-react";
import { TVSeason } from "@/lib/api/types";

interface ListsPhaseProps {
  lists: ListWithItems[];
  listsLoading: boolean;
  addingToListId: number | null;
  creatingNewList: boolean;
  successListId: number | null;
  addMode: 'show' | 'seasons';
  selectedSeasons: Set<number>;
  tvShowSeasons?: TVSeason[];
  isItemInList: (list: ListWithItems) => boolean;
  getSeasonsInListCount: (list: ListWithItems) => number;
  handleCreateNewList: () => void;
  handleAddToList: (listId: number) => void;
}

export function ListsPhase({
  lists,
  listsLoading,
  addingToListId,
  creatingNewList,
  successListId,
  addMode,
  selectedSeasons,
  tvShowSeasons,
  isItemInList,
  getSeasonsInListCount,
  handleCreateNewList,
  handleAddToList
}: ListsPhaseProps) {
  return (
    <>
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

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-white/80">Your Lists</h3>

        {listsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : lists.length === 0 ? (
          <div className="text-center py-8 text-white/60">
            <p className="text-sm">You don&apos;t have any lists yet.</p>
            <p className="text-sm">Create one to get started!</p>
          </div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
            {lists.map((list) => {
              const alreadyInList = isItemInList(list);
              const itemCount = list.item_count ? parseInt(list.item_count, 10) : 0;

              const seasonsInListCount = addMode === 'seasons' ? getSeasonsInListCount(list) : 0;
              const allSeasonsInList =
                addMode === 'seasons' &&
                tvShowSeasons &&
                seasonsInListCount === tvShowSeasons.length;

              const shouldDisable =
                addingToListId !== null ||
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
                        <p className="font-medium text-white truncate">{list.name}</p>
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
                        <p className="text-sm text-white/60 truncate font-sans">{list.description}</p>
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
  );
}
