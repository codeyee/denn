"use client";

import { Platform } from "@/lib/api/types";
import PlatformFlag from "./PlatformFlag";
import PlatformCountryRow from "./PlatformCountryRow";
import { hasFilteredPlatforms } from "./filterPlatforms";

interface PlatformsDisplayProps {
  platforms: Record<string, Platform[]>;
  title?: string;
}

export function PlatformsDisplay({
  platforms,
  title = "Where to Watch",
}: PlatformsDisplayProps) {
  if (Object.keys(platforms).length === 0) return null;

  // Don't render if no platforms remain after filtering
  if (!hasFilteredPlatforms(platforms)) return null;

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {Object.entries(platforms).map(([countryCode]) => (
          <PlatformFlag key={countryCode} countryCode={countryCode} />
        ))}
      </div>

      {Object.entries(platforms).map(([countryCode, platformList]) => (
        <PlatformCountryRow
          key={countryCode}
          countryCode={countryCode}
          platformList={platformList}
        />
      ))}
    </div>
  );
}
