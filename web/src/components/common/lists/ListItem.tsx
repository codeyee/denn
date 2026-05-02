import React from "react";

interface ListItemProps {
  title: string;
  description?: string;
  subDescription?: string; // New prop for additional metadata
  rating?: number | null;
  image?: string | null;
  imageAlt?: string;
  leadingContent?: React.ReactNode;
  trailingContent?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  imageFullHeight?: boolean; // New prop for full-height image
}

export function ListItem({
  title,
  description,
  subDescription,
  rating,
  image,
  imageAlt = "",
  leadingContent,
  trailingContent,
  className = "",
  onClick,
  imageFullHeight = false,
}: ListItemProps) {
  const isClickable = !!onClick;

  if (imageFullHeight && image) {
    // Desktop layout: Image on left side, content on right
    // Mobile layout: Image as full background
    return (
      <div
        className={`group relative rounded-lg overflow-hidden ${
          isClickable ? "cursor-pointer" : ""
        } ${className}`}
        onClick={onClick}
      >
        {/* Mobile: Full background image */}
        <div className="absolute inset-0 md:hidden">
          <img
            src={image}
            alt={imageAlt}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Darker overlay for mobile */}
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent" />
        </div>

        {/* Desktop: Side-by-side layout with solid background */}
        <div className="hidden md:flex items-stretch min-h-[100px] bg-list-item-background group-hover:bg-list-item-background-hover">
          {/* Full-height Image with fade - wider for backdrop 16:9 aspect ratio */}
          <div className="relative w-44 shrink-0">
            <img
              src={image}
              alt={imageAlt}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Left-to-right transparency fade like navbar gradient */}
            <div className="absolute inset-0 bg-linear-to-r from-transparent via-black/70 to-list-item-background group-hover:to-list-item-background-hover pointer-events-none" />
          </div>

          {/* Content */}
          <div className="flex items-center flex-1 gap-3 px-4 py-3">
            {/* Leading Content */}
            {leadingContent && (
              <div className="shrink-0">{leadingContent}</div>
            )}

            {/* Text Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-medium line-clamp-3">{title}</h3>
                {rating && (
                  <span className="text-yellow-400 font-medium text-sm">
                    ★ {rating}
                  </span>
                )}
              </div>
              {description && (
                <p className="text-gray-400 text-sm line-clamp-3 font-sans">{description}</p>
              )}
              {subDescription && (
                <p className="text-gray-500 text-xs line-clamp-3 font-sans">{subDescription}</p>
              )}
            </div>

            {/* Trailing Content */}
            {trailingContent && (
              <div className="shrink-0 flex items-center gap-2 font-sans">
                {trailingContent}
              </div>
            )}
          </div>
        </div>

        {/* Mobile: Content over background image */}
        <div className="relative z-10 flex items-center gap-3 px-4 py-3 min-h-[100px] md:hidden">
          {/* Leading Content */}
          {leadingContent && (
            <div className="shrink-0">{leadingContent}</div>
          )}

          {/* Text Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium text-sm drop-shadow-text wrap-break-word line-clamp-3">
              {title}
            </h3>
            {description && (
              <p className="text-gray-300 text-xs drop-shadow-text truncate">
                {description}
              </p>
            )}
          </div>

          {/* Trailing Content */}
          {trailingContent && (
            <div className="shrink-0 flex items-center gap-2">
              {trailingContent}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Original layout
  return (
    <div
      className={`bg-list-item-background rounded-lg p-4 hover:bg-list-item-background-hover ${
        isClickable ? "cursor-pointer" : ""
      } ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        {/* Leading Content (e.g., track number, index) */}
        {leadingContent && (
          <div className="shrink-0">{leadingContent}</div>
        )}

        {/* Optional Image with Fade Effect */}
        {image && (
          <div className="shrink-0 relative w-12 h-12 rounded overflow-hidden">
            <img
              src={image}
              alt={imageAlt}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Left-to-right fade overlay */}
            <div className="absolute inset-0 bg-linear-to-r from-transparent via-transparent to-black/20 pointer-events-none" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-medium mb-1 line-clamp-3">{title}</h3>
            {rating && (
              <span className="text-yellow-400 font-medium text-sm">
                ★ {rating}
              </span>
            )}
          </div>
          {description && (
            <p className="text-gray-400 text-sm line-clamp-3">{description}</p>
          )}
          {subDescription && (
            <p className="text-gray-500 text-xs line-clamp-3 font-sans">{subDescription}</p>
          )}
        </div>

        {/* Trailing Content (e.g., duration, buttons) */}
        {trailingContent && (
          <div className="shrink-0 flex items-center gap-2">
            {trailingContent}
          </div>
        )}
      </div>
    </div>
  );
}
