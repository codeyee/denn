import { useEffect, useState } from "react";

import type { Content, ModerationSummary } from "@/lib/types";
import { shouldBlurModerationArtwork } from "@/lib/utils/moderationUtils";

export function useModerationArtworkReveal(
  item: Pick<Content, "id" | "image_url">,
  summary?: ModerationSummary,
) {
  const [isRevealed, setIsRevealed] = useState(false);
  const requiresBlur = shouldBlurModerationArtwork(summary);

  useEffect(() => {
    setIsRevealed(false);
  }, [item.id, item.image_url, summary?.status, summary?.classification]);

  return {
    requiresBlur,
    isRevealed,
    isBlurred: requiresBlur && !isRevealed,
    toggle: () => setIsRevealed((current) => !current),
  };
}
