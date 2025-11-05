"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import ListItem from "./ListItem";

interface ExpandableListItemProps {
  title: string;
  description?: string;
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

export default function ExpandableListItem({
  title,
  description,
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
        image={image}
        imageAlt={imageAlt}
        leadingContent={leadingContent}
        imageFullHeight={imageFullHeight}
        trailingContent={
          <div className="flex items-center gap-2">
            {trailingContent}
            {expandedContent && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggle();
                }}
                className="text-white/60 hover:text-white transition-colors p-1"
                aria-label={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </button>
            )}
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
