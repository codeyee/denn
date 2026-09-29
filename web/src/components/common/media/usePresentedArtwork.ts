import type { ModerationSummary } from "@/lib/types";
import {
  useModerationPresentation,
  useVisibleModerationSummary,
} from "@/components/common/providers/ModerationPresentationProvider";
import { useModerationArtworkReveal } from "./useModerationArtworkReveal";

/**
 * Blur state for artwork that carries a moderation summary. The summary follows
 * the server-resolved visibility flag; `explicitSummary` (the dev preview) is
 * applied as given.
 */
export function usePresentedArtwork(
  item: { id: string | number; image_url?: string | null },
  summary: ModerationSummary | undefined,
  explicitSummary?: ModerationSummary,
) {
  const visibleSummary = useVisibleModerationSummary(summary);
  const { allowAdultContent } = useModerationPresentation();
  return useModerationArtworkReveal(
    item,
    explicitSummary ?? visibleSummary,
    allowAdultContent,
  );
}
