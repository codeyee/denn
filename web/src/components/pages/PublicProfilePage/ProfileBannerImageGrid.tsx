import type { ProfileBannerOption } from "@/lib/types";

interface ProfileBannerImageGridProps {
  options: ProfileBannerOption[];
  imageId: number | null;
  onImageChange: (imageId: number | null) => void;
}

export function ProfileBannerImageGrid({
  options,
  imageId,
  onImageChange,
}: ProfileBannerImageGridProps) {
  return (
    <div className="space-y-2">
      <span className="block text-xs font-medium text-white/75">Image</span>
      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-3"
        role="group"
        aria-label="Choose the profile banner image"
      >
        {options.map((option) => {
          const isSelected = option.image_id === imageId;
          return (
            <button
              key={`${option.content_id}-${option.image_id ?? "auto"}`}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onImageChange(option.image_id ?? null)}
              className="group overflow-hidden rounded-lg border border-white/15 bg-black/25 text-left outline-none transition-colors hover:border-white/50 focus-visible:ring-4 focus-visible:ring-white/60 aria-pressed:border-white aria-pressed:bg-white/10 motion-reduce:transition-none"
            >
              <img
                src={option.image_url}
                alt=""
                className={`h-24 w-full ${option.treatment === "cover" ? "object-cover" : "object-contain p-2"}`}
                loading="lazy"
              />
              <span className="block truncate px-2 py-2 text-xs text-white/75">
                {option.image_id === null
                  ? "Best available"
                  : option.treatment === "cover"
                    ? "Gallery"
                    : "Cover"}
                {isSelected ? " · Selected" : ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
