import { useState } from "react";

import type { ModerationSummary } from "@/lib/types";
import { shouldBlurModerationArtwork } from "@/lib/utils/moderationUtils";

export function useModerationArtworkReveal(
  item: { id: string | number; image_url?: string | null },
  summary?: ModerationSummary,
  allowAdultContent = false,
) {
  const requiresBlur = shouldBlurModerationArtwork(summary, allowAdultContent);
  const artworkKey = JSON.stringify([
    item.id,
    item.image_url ?? null,
    summary?.status,
    summary?.classification,
    allowAdultContent,
  ]);
  const [artworkState, setArtworkState] = useState({
    artworkKey,
    isRevealed: false,
  });

  if (artworkState.artworkKey !== artworkKey) {
    setArtworkState({ artworkKey, isRevealed: false });
  }

  const isRevealed =
    artworkState.artworkKey === artworkKey && artworkState.isRevealed;

  return {
    requiresBlur,
    isRevealed,
    isBlurred: requiresBlur && !isRevealed,
    toggle: () =>
      setArtworkState((current) => ({
        artworkKey,
        isRevealed:
          current.artworkKey === artworkKey ? !current.isRevealed : true,
      })),
  };
}
