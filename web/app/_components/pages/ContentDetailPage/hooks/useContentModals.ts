import { useState, useCallback } from "react";

interface UseContentModalsReturn {
  isRatingModalOpen: boolean;
  isAddToListModalOpen: boolean;
  openRatingModal: () => void;
  closeRatingModal: () => void;
  setIsRatingModalOpen: (open: boolean) => void;
  openAddToListModal: () => void;
  closeAddToListModal: () => void;
  setIsAddToListModalOpen: (open: boolean) => void;
}

export function useContentModals(): UseContentModalsReturn {
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [isAddToListModalOpen, setIsAddToListModalOpen] = useState(false);

  const openRatingModal = useCallback(() => {
    setIsRatingModalOpen(true);
  }, []);

  const closeRatingModal = useCallback(() => {
    setIsRatingModalOpen(false);
  }, []);

  const openAddToListModal = useCallback(() => {
    setIsAddToListModalOpen(true);
  }, []);

  const closeAddToListModal = useCallback(() => {
    setIsAddToListModalOpen(false);
  }, []);

  return {
    isRatingModalOpen,
    isAddToListModalOpen,
    openRatingModal,
    closeRatingModal,
    setIsRatingModalOpen,
    openAddToListModal,
    closeAddToListModal,
    setIsAddToListModalOpen
  };
}
