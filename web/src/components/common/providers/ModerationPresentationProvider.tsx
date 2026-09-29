import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { ModerationSummary } from "@/lib/types";
import {
  shouldBlurModerationArtwork,
  visibleModerationSummary,
} from "@/lib/utils/moderationUtils";

interface ModerationPresentation {
  visibilityEnabled: boolean;
  allowAdultContent: boolean;
}

// The default is the fail-safe off state: nothing blurs without a provider.
const ModerationPresentationContext = createContext<ModerationPresentation>({
  visibilityEnabled: false,
  allowAdultContent: false,
});

interface ModerationPresentationProviderProps extends ModerationPresentation {
  children: ReactNode;
}

export function ModerationPresentationProvider({
  visibilityEnabled,
  allowAdultContent,
  children,
}: ModerationPresentationProviderProps) {
  const value = useMemo(
    () => ({ visibilityEnabled, allowAdultContent }),
    [visibilityEnabled, allowAdultContent],
  );
  return (
    <ModerationPresentationContext.Provider value={value}>
      {children}
    </ModerationPresentationContext.Provider>
  );
}

export function useModerationPresentation(): ModerationPresentation {
  return useContext(ModerationPresentationContext);
}

export function useVisibleModerationSummary(
  summary: ModerationSummary | undefined,
): ModerationSummary | undefined {
  const { visibilityEnabled } = useModerationPresentation();
  return visibleModerationSummary(summary, visibilityEnabled);
}

export function useModerationArtworkBlur(
  summary: ModerationSummary | undefined,
): boolean {
  const { allowAdultContent } = useModerationPresentation();
  return shouldBlurModerationArtwork(
    useVisibleModerationSummary(summary),
    allowAdultContent,
  );
}
