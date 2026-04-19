import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SettingsState {
  animationsEnabled: boolean;
  countryCode: string | null;
}

interface SettingsActions {
  toggleAnimations: () => void;
  setAnimationsEnabled: (enabled: boolean) => void;
  setCountryCode: (code: string) => void;
}

export type SettingsStore = SettingsState & SettingsActions;

const initialState: SettingsState = {
  animationsEnabled: true,
  countryCode: null,
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

      setCountryCode: (code: string) => {
        set({ countryCode: code.toUpperCase() });
      },
    }),
    {
      name: "app-settings",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

