"use client";

import { Platform } from "@/lib/types";
import { filterPlatforms } from "./filterPlatforms";
import { PlatformTile } from "./PlatformTile";

interface PlatformActionGroupProps {
  actionLabel: string;
  platformList: Platform[];
}

export function PlatformActionGroup({
  actionLabel,
  platformList,
}: PlatformActionGroupProps) {
  const filtered = filterPlatforms(platformList);
  if (filtered.length === 0) return null;

  return (
    <div className="mb-6">
      <p className="text-sm text-white/60 mb-3 font-medium uppercase tracking-wide">
        {actionLabel}
      </p>
      <div className="flex flex-wrap gap-3">
        {filtered.map((platform, index) => (
          <PlatformTile key={`${platform.name}-${index}`} platform={platform} />
        ))}
      </div>
    </div>
  );
}
