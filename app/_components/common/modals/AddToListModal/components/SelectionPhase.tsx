import Image from "next/image";
import { TVSeason } from "@/lib/types";
import { ListWithItems } from "@/lib/types";

interface SelectionPhaseProps {
  addMode: 'show' | 'seasons';
  setAddMode: (mode: 'show' | 'seasons') => void;
  tvShowSeasons: TVSeason[];
  selectedSeasons: Set<number>;
  toggleSeason: (seasonNumber: number) => void;
  selectAllSeasons: () => void;
  deselectAllSeasons: () => void;
  lists: ListWithItems[];
  isSeasonInList: (list: ListWithItems, seasonNumber: number) => boolean;
}

export function SelectionPhase({
  addMode,
  setAddMode,
  tvShowSeasons,
  selectedSeasons,
  toggleSeason,
  selectAllSeasons,
  deselectAllSeasons,
  lists,
  isSeasonInList
}: SelectionPhaseProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-3">
        <label className="flex items-start gap-3 p-3 sm:p-4 rounded-lg border-2 border-white/10 hover:bg-white/5 hover:border-white/20 cursor-pointer transition-all min-h-[44px]">
          <input
            type="radio"
            name="addMode"
            value="show"
            checked={addMode === 'show'}
            onChange={() => setAddMode('show')}
            className="mt-1 cursor-pointer shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-white text-base">Add TV Show</div>
            <div className="text-sm text-white/60 mt-1 break-words">
              Add the complete TV show as a single item to track and rate the series as a whole
            </div>
          </div>
        </label>

        <label className="flex items-start gap-3 p-3 sm:p-4 rounded-lg border-2 border-white/10 hover:bg-white/5 hover:border-white/20 cursor-pointer transition-all min-h-[44px]">
          <input
            type="radio"
            name="addMode"
            value="seasons"
            checked={addMode === 'seasons'}
            onChange={() => setAddMode('seasons')}
            className="mt-1 cursor-pointer shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-white text-base">Add Individual Seasons</div>
            <div className="text-sm text-white/60 mt-1 break-words">
              Choose specific seasons to track and rate individually for more granular management
            </div>
          </div>
        </label>
      </div>

      {addMode === 'seasons' && (
        <div className="mt-4 space-y-3 p-4 border border-white/10 rounded-lg bg-white/5">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white">
              Select Seasons ({selectedSeasons.size}/{tvShowSeasons.length} selected)
            </h4>
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
  );
}
