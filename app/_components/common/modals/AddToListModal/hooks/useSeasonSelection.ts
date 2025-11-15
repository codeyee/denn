import { useState, useCallback } from "react";
import { TVSeason } from "@/lib/api/types";

interface UseSeasonSelectionReturn {
  selectedSeasons: Set<number>;
  toggleSeason: (seasonNumber: number) => void;
  selectAllSeasons: () => void;
  deselectAllSeasons: () => void;
  resetSelection: () => void;
}

export function useSeasonSelection(tvShowSeasons?: TVSeason[]): UseSeasonSelectionReturn {
  const [selectedSeasons, setSelectedSeasons] = useState<Set<number>>(new Set());

  const toggleSeason = useCallback((seasonNumber: number) => {
    setSelectedSeasons(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(seasonNumber)) {
        newSelected.delete(seasonNumber);
      } else {
        newSelected.add(seasonNumber);
      }
      return newSelected;
    });
  }, []);

  const selectAllSeasons = useCallback(() => {
    if (tvShowSeasons) {
      setSelectedSeasons(new Set(tvShowSeasons.map(s => s.season_number)));
    }
  }, [tvShowSeasons]);

  const deselectAllSeasons = useCallback(() => {
    setSelectedSeasons(new Set());
  }, []);

  const resetSelection = useCallback(() => {
    setSelectedSeasons(new Set());
  }, []);

  return {
    selectedSeasons,
    toggleSeason,
    selectAllSeasons,
    deselectAllSeasons,
    resetSelection
  };
}
