
import React, { useState } from "react";
import { ListItem } from "./ListItem";

interface ExpandableListItemProps {
  title: string;
  description?: string;
  subDescription?: string;
  rating?: number | null;
  image?: string | null;
  imageAlt?: string;
  leadingContent?: React.ReactNode;
  trailingContent?: React.ReactNode;
  expandedContent?: React.ReactNode;
  className?: string;
  defaultExpanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
  imageFullHeight?: boolean; // New prop
}

export function ExpandableListItem({
  title,
  description,
  subDescription,
  rating,
  image,
  imageAlt,
  leadingContent,
  trailingContent,
  expandedContent,
  className = "",
  defaultExpanded = false,
  onExpandChange,
  imageFullHeight = false,
}: ExpandableListItemProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleToggle = () => {
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);
    onExpandChange?.(newExpandedState);
  };

  return (
    <div className={className}>
      <ListItem
        title={title}
        description={description}
        subDescription={subDescription}
        rating={rating}
        image={image}
        imageAlt={imageAlt}
        leadingContent={leadingContent}
        imageFullHeight={imageFullHeight}
        onClick={expandedContent ? handleToggle : undefined}
        className={expandedContent ? "cursor-pointer" : ""}
        trailingContent={
          <div className="flex items-center gap-2">
            {trailingContent}
          </div>
        }
      />

      {/* Expanded Content */}
      {expandedContent && isExpanded && (
        <div className="mt-2 bg-white/5 rounded-lg p-4 border-l-2 border-white/20">
          {expandedContent}
        </div>
      )}
    </div>
  );
}
