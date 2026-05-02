import { useState, useCallback } from "react";

interface UseModalPhasesParams {
  isMultiSeasonShow: boolean;
}

interface UseModalPhasesReturn {
  modalPhase: 'selection' | 'lists';
  addMode: 'show' | 'seasons';
  setAddMode: (mode: 'show' | 'seasons') => void;
  handleContinueToLists: (
    addMode: 'show' | 'seasons',
    selectedSeasonsSize: number,
    setError: (error: string | null) => void
  ) => void;
  handleBackToSelection: (setError: (error: string | null) => void) => void;
  resetPhases: () => void;
}

export function useModalPhases({
  isMultiSeasonShow
}: UseModalPhasesParams): UseModalPhasesReturn {
  const [modalPhase, setModalPhase] = useState<'selection' | 'lists'>(
    isMultiSeasonShow ? 'selection' : 'lists'
  );
  const [addMode, setAddMode] = useState<'show' | 'seasons'>('show');

  const handleContinueToLists = useCallback((
    currentAddMode: 'show' | 'seasons',
    selectedSeasonsSize: number,
    setError: (error: string | null) => void
  ) => {
    if (currentAddMode === 'seasons' && selectedSeasonsSize === 0) {
      setError("Please select at least one season to continue");
      return;
    }
    setError(null);
    setModalPhase('lists');
  }, []);

  const handleBackToSelection = useCallback((setError: (error: string | null) => void) => {
    setError(null);
    setModalPhase('selection');
  }, []);

  const resetPhases = useCallback(() => {
    setModalPhase(isMultiSeasonShow ? 'selection' : 'lists');
    setAddMode('show');
  }, [isMultiSeasonShow]);

  return {
    modalPhase,
    addMode,
    setAddMode,
    handleContinueToLists,
    handleBackToSelection,
    resetPhases
  };
}
