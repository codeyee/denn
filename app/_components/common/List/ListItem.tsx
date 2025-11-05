import React from "react";
import Image from "next/image";

interface ListItemProps {
  title: string;
  description?: string;
  image?: string | null;
  imageAlt?: string;
  leadingContent?: React.ReactNode;
  trailingContent?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  imageFullHeight?: boolean; // New prop for full-height image
}

export default function ListItem({
  title,
  description,
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
    // New layout: Image touches borders, content on the right
    return (
      <div
        className={`group bg-[var(--color-list-item-background)] rounded-lg hover:bg-[var(--color-list-item-background-hover)] overflow-hidden ${
          isClickable ? "cursor-pointer" : ""
        } ${className}`}
        onClick={onClick}
      >
        <div className="flex items-stretch min-h-[100px]">
          {/* Full-height Image with fade - wider for backdrop 16:9 aspect ratio */}
          <div className="relative w-44 flex-shrink-0">
            <Image
              src={image}
              alt={imageAlt}
              fill
              className="object-cover"
              sizes="176px"
            />
            {/* Left-to-right transparency fade like navbar gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/70 to-[var(--color-list-item-background)] group-hover:to-[var(--color-list-item-background-hover)] pointer-events-none" />
          </div>

          {/* Content */}
          <div className="flex items-center flex-1 gap-3 px-4 py-3">
            {/* Leading Content */}
            {leadingContent && (
              <div className="flex-shrink-0">{leadingContent}</div>
            )}

            {/* Text Content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-medium truncate">{title}</h3>
              {description && (
                <p className="text-gray-400 text-sm truncate">{description}</p>
              )}
            </div>

            {/* Trailing Content */}
            {trailingContent && (
              <div className="flex-shrink-0 flex items-center gap-2">
                {trailingContent}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Original layout
  return (
    <div
      className={`bg-[var(--color-list-item-background)] rounded-lg p-4 hover:bg-[var(--color-list-item-background-hover)] ${
        isClickable ? "cursor-pointer" : ""
      } ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        {/* Leading Content (e.g., track number, index) */}
        {leadingContent && (
          <div className="flex-shrink-0">{leadingContent}</div>
        )}

        {/* Optional Image with Fade Effect */}
        {image && (
          <div className="flex-shrink-0 relative w-12 h-12 rounded overflow-hidden">
            <Image
              src={image}
              alt={imageAlt}
              fill
              className="object-cover"
              sizes="48px"
            />
            {/* Left-to-right fade overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/20 pointer-events-none" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-medium mb-1 truncate">{title}</h3>
          {description && (
            <p className="text-gray-400 text-sm truncate">{description}</p>
          )}
        </div>

        {/* Trailing Content (e.g., duration, buttons) */}
        {trailingContent && (
          <div className="flex-shrink-0 flex items-center gap-2">
            {trailingContent}
          </div>
        )}
      </div>
    </div>
  );
}
