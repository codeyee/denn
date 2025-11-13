import React from "react";

interface VerticalListProps {
  children: React.ReactNode;
  className?: string;
  spacing?: "none" | "sm" | "md" | "lg";
}

const spacingClasses = {
  none: "space-y-0",
  sm: "space-y-2",
  md: "space-y-3",
  lg: "space-y-5",
};

export default function VerticalList({
  children,
  className = "",
  spacing = "md",
}: VerticalListProps) {
  return (
    <div className={`${spacingClasses[spacing]} ${className}`}>
      {children}
    </div>
  );
}
