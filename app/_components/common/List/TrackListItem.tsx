"use client";

import { ExternalLink } from "lucide-react";
import ExpandableListItem from "./ExpandableListItem";

interface TrackListItemProps {
  trackNumber: number;
  title: string;
  artists?: string[];
  duration?: string;
  externalUrl?: string;
  image?: string | null;
  additionalDetails?: React.ReactNode;
}

export default function TrackListItem({
  trackNumber,
  title,
  artists,
  duration,
  externalUrl,
  image,
  additionalDetails,
}: TrackListItemProps) {
  const leadingContent = (
    <div className="w-8 text-center">
      <span className="text-white/60 text-sm font-medium">{trackNumber}</span>
    </div>
  );

  const trailingContent = (
    <>
      {duration && (
        <span className="text-white/60 text-sm">{duration}</span>
      )}
      {externalUrl && (
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/60 hover:text-white transition-colors"
          aria-label={`Open ${title} in external service`}
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      )}
    </>
  );

  const description = artists && artists.length > 0 ? artists.join(", ") : undefined;

  return (
    <ExpandableListItem
      title={title}
      description={description}
      image={image}
      imageAlt={title}
      leadingContent={leadingContent}
      trailingContent={trailingContent}
      expandedContent={additionalDetails}
    />
  );
}
