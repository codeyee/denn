import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SettingsState {
  animationsEnabled: boolean;
}

interface SettingsActions {
  toggleAnimations: () => void;
  setAnimationsEnabled: (enabled: boolean) => void;
}

export type SettingsStore = SettingsState & SettingsActions;

const initialState: SettingsState = {
  animationsEnabled: true,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...initialState,

      toggleAnimations: () => {
        set((state) => ({ animationsEnabled: !state.animationsEnabled }));
      },

      setAnimationsEnabled: (enabled: boolean) => {
        set({ animationsEnabled: enabled });
      },
    }),
    {
      name: "app-settings",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

