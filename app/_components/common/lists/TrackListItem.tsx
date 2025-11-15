"use client";

import { ExternalLink } from "lucide-react";
import { ListItem } from "./ListItem";

interface TrackListItemProps {
  trackNumber: number;
  title: string;
  artists?: string[];
  duration?: string;
  externalUrl?: string;
  image?: string | null;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function TrackListItem({
  trackNumber,
  title,
  artists,
  duration,
  externalUrl,
  image,
}: TrackListItemProps) {
  const leadingContent = (
    <div className="w-8 text-center">
      <span className="text-white/60 text-sm font-medium">{trackNumber}</span>
    </div>
  );

  const trailingContent = (
    <div className="flex items-center gap-4">
      {duration && (
        <span className="text-white/60 text-sm">{duration}</span>
      )}
      {externalUrl && (
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/60 hover:text-white transition-colors"
          aria-label={`Open ${title} in Spotify`}
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      )}
    </div>
  );

  const description = artists && artists.length > 0 ? artists.join(", ") : undefined;

  const handleClick = () => {
    if (externalUrl) {
      window.open(externalUrl, '_blank', 'noopener,noreferrer');
    }
  };
  
  return (
    <ListItem
      title={title}
      description={description}
      image={image}
      imageAlt={title}
      imageFullHeight={true}
      leadingContent={leadingContent}
      trailingContent={trailingContent}
      onClick={handleClick}
    />
  );
}
