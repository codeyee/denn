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
      title={isRevealed ? "Blur artwork" : "Reveal artwork"}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle();
      }}
      className="pointer-events-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/70 bg-black/90 p-0 text-white shadow-lg outline-none transition hover:bg-black focus-visible:ring-4 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
    >
      {isRevealed ? (
        <EyeOff aria-hidden="true" className="h-5 w-5" />
      ) : (
        <Eye aria-hidden="true" className="h-5 w-5" />
      )}
    </button>
  );
}
