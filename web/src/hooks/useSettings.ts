
import { useSettingsStore } from "@/stores/settings-store";

export function useSettings() {
  const { animationsEnabled, toggleAnimations } = useSettingsStore();

  return {
    settings: { animationsEnabled },
    isLoading: false,
    toggleAnimations,
  };
}
