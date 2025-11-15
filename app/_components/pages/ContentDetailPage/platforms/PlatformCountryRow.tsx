"use client";

import { Platform } from "@/lib/types";
import { filterPlatforms } from "./filterPlatforms";
import { PlatformTile } from "./PlatformTile";

interface PlatformCountryRowProps {
  countryCode: string;
  platformList: Platform[];
}

export function PlatformCountryRow({
  countryCode,
  platformList,
}: PlatformCountryRowProps) {
  const filtered = filterPlatforms(platformList);
  if (filtered.length === 0) return null;

  return (
    <div key={countryCode} className="mb-6">
      <div className="flex flex-wrap gap-3">
        {filtered.map((platform, index) => (
          <PlatformTile key={`${platform.title ?? index}-${index}`} platform={platform} />
        ))}
      </div>
    </div>
  );
}
