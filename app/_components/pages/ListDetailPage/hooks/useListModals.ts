import { useState } from "react";
import { ListItem } from "@/types";

interface UseListModalsReturn {
  isEditModalOpen: boolean;
  isDeleteListDialogOpen: boolean;
  deleteItemId: number | null;
  ratingModalItem: ListItem | null;
  isRatingModalOpen: boolean;
  openEditModal: () => void;
  closeEditModal: () => void;
  openDeleteListDialog: () => void;
  closeDeleteListDialog: () => void;
  openDeleteItemDialog: (itemId: number) => void;
  closeDeleteItemDialog: () => void;
  openRatingModal: (item: ListItem) => void;
  closeRatingModal: () => void;
}

export function useListModals(): UseListModalsReturn {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteListDialogOpen, setIsDeleteListDialogOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
  const [ratingModalItem, setRatingModalItem] = useState<ListItem | null>(null);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);

  return {
    isEditModalOpen,
    isDeleteListDialogOpen,
    deleteItemId,
    ratingModalItem,
    isRatingModalOpen,
    openEditModal: () => setIsEditModalOpen(true),
    closeEditModal: () => setIsEditModalOpen(false),
    openDeleteListDialog: () => setIsDeleteListDialogOpen(true),
    closeDeleteListDialog: () => setIsDeleteListDialogOpen(false),
    openDeleteItemDialog: (itemId: number) => setDeleteItemId(itemId),
    closeDeleteItemDialog: () => setDeleteItemId(null),
    openRatingModal: (item: ListItem) => {
      setRatingModalItem(item);
      setIsRatingModalOpen(true);
    },
    closeRatingModal: () => {
      setRatingModalItem(null);
      setIsRatingModalOpen(false);
    },
  };
}
