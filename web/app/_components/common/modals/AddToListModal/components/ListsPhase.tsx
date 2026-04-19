import { Button } from "@/app/_components/common/ui/Button";
import { UserListWithMatches, MatchedItem } from "@/lib/types";
import { Plus, Loader2 } from "lucide-react";

interface ListsPhaseProps {
  lists: UserListWithMatches[];
  listsLoading: boolean;
  loadingListIds: Set<number>;
  creatingNewList: boolean;
  addMode: 'show' | 'seasons';
  selectedSeasons: Set<number>;
  getItemInList: (list: UserListWithMatches) => MatchedItem | undefined;
  getSeasonsInListCount: (list: UserListWithMatches, selectedSeasons?: Set<number>) => number;
  handleCreateNewList: () => void;
  handleToggleList: (listId: number, checked: boolean, existingItemId?: number) => void;
}

export function ListsPhase({
  lists,
  listsLoading,
  loadingListIds,
  creatingNewList,
  addMode,
  selectedSeasons,
  getItemInList,
  getSeasonsInListCount,
  handleCreateNewList,
  handleToggleList
}: ListsPhaseProps) {
  return (
    <>
      <Button
        onClick={handleCreateNewList}
        disabled={creatingNewList}
        className="w-full flex items-center justify-center gap-2 cursor-pointer mb-4"
        variant="default"
      >
        {creatingNewList ? (
          <>
            <Loader2 className="animate-spin w-4 h-4" />
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
            <Loader2 className="animate-spin w-8 h-8 text-white/50" />
          </div>
        ) : lists.length === 0 ? (
          <div className="text-center py-8 text-white/60">
            <p className="text-sm">You don&apos;t have any lists yet.</p>
            <p className="text-sm">Create one to get started!</p>
          </div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
            {lists.map((list) => {
              const existingItem = getItemInList(list);
              const alreadyInList = !!existingItem;

              const seasonsInListCount = addMode === 'seasons' ? getSeasonsInListCount(list, selectedSeasons) : 0;

              const isLoading = loadingListIds.has(list.id);

              // Determine if checked
              const isChecked = addMode === 'show' ? alreadyInList : (seasonsInListCount > 0 && seasonsInListCount === selectedSeasons.size);

              // For seasons mode, we might want a partial check state, but standard checkbox doesn't support indeterminate easily without ref.
              // For now, let's just check if ALL selected seasons are in list?
              // The requirement says "Checked = item is in list".

              const shouldDisable = isLoading || creatingNewList || (addMode === 'seasons' && selectedSeasons.size === 0);

              return (
                <label
                  key={list.id}
                  className={`
                    w-full flex items-center p-3 rounded-lg border transition-all cursor-pointer
                    ${isChecked
                      ? "bg-green-500/10 border-green-500/30"
                      : "bg-card border-border hover:bg-card/80 hover:border-white/30"
                    }
                    ${shouldDisable ? "opacity-50 cursor-not-allowed" : ""}
                  `}
                >
                  <div className="relative flex items-center justify-center w-5 h-5 mr-3">
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white/70" />
                    ) : (
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={shouldDisable}
                        onChange={(e) => handleToggleList(list.id, e.target.checked, existingItem?.list_item_id)}
                        className="w-5 h-5 rounded border-gray-500 text-green-500 focus:ring-green-500 bg-transparent"
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-white truncate">{list.name}</p>
                      {addMode === 'seasons' && seasonsInListCount > 0 && (
                        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-sans shrink-0">
                          {seasonsInListCount} {seasonsInListCount === 1 ? 'season' : 'seasons'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/50 font-sans">
                      <span>{list.list_type === 'SHARED' ? 'Collaborative' : 'Personal'}</span>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
