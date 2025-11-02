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

export type UIStore = ModalState & ModalActions;

const initialState: ModalState = {
  isOpen: false,
  modalId: null,
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
}));
