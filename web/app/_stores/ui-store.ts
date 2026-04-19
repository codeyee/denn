import { create } from "zustand";

interface ModalState {
  isOpen: boolean;
  modalId: string | null;
}

interface ModalActions {
  openModal: (modalId: string) => void;
  closeModal: () => void;
  toggleModal: (modalId: string) => void;
}

interface ReorderState {
  isReorderMode: boolean;
  reorderingListId: number | null;
}

interface ReorderActions {
  enterReorderMode: (listId: number) => void;
  exitReorderMode: () => void;
}

export type UIStore = ModalState & ModalActions & ReorderState & ReorderActions;

const initialState: ModalState & ReorderState = {
  isOpen: false,
  modalId: null,
  isReorderMode: false,
  reorderingListId: null,
};

export const useUIStore = create<UIStore>()((set) => ({
  ...initialState,

  openModal: (modalId: string) => {
    set({ isOpen: true, modalId });
  },

  closeModal: () => {
    set({ isOpen: false, modalId: null });
  },

  toggleModal: (modalId: string) => {
    set((state) => ({
      isOpen: state.modalId === modalId ? !state.isOpen : true,
      modalId,
    }));
  },

  enterReorderMode: (listId: number) => {
    set({ isReorderMode: true, reorderingListId: listId });
  },

  exitReorderMode: () => {
    set({ isReorderMode: false, reorderingListId: null });
  },
}));
