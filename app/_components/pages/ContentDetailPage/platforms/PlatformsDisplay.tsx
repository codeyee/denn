"use client";

import { Platform } from "@/lib/types";
import { PlatformActionGroup } from "./PlatformActionGroup";
import { hasFilteredPlatforms } from "./filterPlatforms";

interface PlatformsDisplayProps {
  platforms: Record<string, Platform[]>;
  title?: string;
}

const ACTION_LABELS: Record<string, string> = {
  stream: "Stream",
  rent: "Rent",
  buy: "Buy",
  platforms: "Available On",
};

export function PlatformsDisplay({
  platforms,
  title = "Where to Watch",
}: PlatformsDisplayProps) {
  if (Object.keys(platforms).length === 0) return null;

  if (!hasFilteredPlatforms(platforms)) return null;

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>

      {Object.entries(platforms).map(([actionType, platformList]) => (
        <PlatformActionGroup
          key={actionType}
          actionLabel={ACTION_LABELS[actionType] || actionType}
          platformList={platformList}
        />
      ))}
    </div>
  );
}
