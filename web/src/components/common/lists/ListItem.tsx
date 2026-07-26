import React from "react";
import { MediaListItem } from "./MediaListItem";

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
    return (
      <MediaListItem
        title={title}
        description={description}
        subDescription={subDescription}
        image={image}
        imageAlt={imageAlt}
        leadingContent={leadingContent}
        trailingContent={trailingContent}
        className={className}
        onClick={onClick}
      />
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
