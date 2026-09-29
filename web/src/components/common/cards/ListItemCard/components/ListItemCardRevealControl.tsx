import { ModerationRevealButton } from "@/components/common/media/ModerationRevealButton";
import type { useModerationArtworkReveal } from "@/components/common/media/useModerationArtworkReveal";

export function ListItemCardRevealControl({
  artwork,
}: {
  artwork: ReturnType<typeof useModerationArtworkReveal>;
}) {
  if (!artwork.requiresBlur) return null;

  return (
    <div className="pointer-events-none absolute left-3 top-11 z-40">
      <ModerationRevealButton
        isRevealed={artwork.isRevealed}
        onToggle={artwork.toggle}
      />
    </div>
  );
}
