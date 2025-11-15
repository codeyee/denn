"use client";

import { useSettingsStore } from "@/app/_stores/settings-store";

export function useSettings() {
  const { animationsEnabled, toggleAnimations } = useSettingsStore();

  return {
    settings: { animationsEnabled },
    isLoading: false,
    toggleAnimations,
  };
}
