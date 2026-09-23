import { Eye, EyeOff } from "lucide-react";

interface ModerationRevealButtonProps {
  isRevealed: boolean;
  onToggle: () => void;
}

export function ModerationRevealButton({
  isRevealed,
  onToggle,
}: ModerationRevealButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={isRevealed}
      aria-label={isRevealed ? "Blur artwork" : "Reveal artwork"}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle();
      }}
      className="absolute left-1/2 top-1/2 z-40 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border border-white/40 bg-black/80 px-4 py-3 text-sm font-semibold text-white shadow-lg outline-none transition hover:bg-black focus-visible:ring-4 focus-visible:ring-white/80"
    >
      {isRevealed ? (
        <EyeOff aria-hidden="true" className="h-4 w-4" />
      ) : (
        <Eye aria-hidden="true" className="h-4 w-4" />
      )}
      {isRevealed ? "Blur artwork" : "Reveal artwork"}
    </button>
  );
}
