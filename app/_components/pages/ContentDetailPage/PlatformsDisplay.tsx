"use client";

import { Platform } from "@/lib/api/types";

interface PlatformsDisplayProps {
  platforms: Record<string, Platform[]>;
  title?: string;
}

export default function PlatformsDisplay({ platforms, title = "Where to Watch" }: PlatformsDisplayProps) {
  if (Object.keys(platforms).length === 0) return null;

  // Filter out redundant platform variants
  const filterPlatforms = (platformList: Platform[]) => {
    const excludeTerms = [
      "Amazon Channel",
      "Apple TV Channel",
      "Roku Premium Channel",
      "with Ads",
    ];

    return platformList.filter(platform => {
      return !excludeTerms.some(term => platform.title.toLowerCase().includes(term.toLowerCase()));
    });
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {Object.entries(platforms).map(([countryCode]) => (
          <div
            key={countryCode}
            className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center"
            title={countryCode}
          >
            <img
              src={`https://flagsapi.com/${countryCode}/flat/64.png`}
              alt={countryCode}
              title={countryCode}
              className="h-14 w-auto object-cover"
            />
          </div>
        ))}
      </div>
      {Object.entries(platforms).map(([countryCode, platformList]) => (
        <div key={countryCode} className="mb-6">
          <div className="flex flex-wrap gap-3">
            {filterPlatforms(platformList).map((platform, index) => (
              <div key={index} className="flex flex-col items-center gap-2">
                <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-white/10">
                  {platform.image_url && (
                    <img
                      src={platform.image_url}
                      alt={platform.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="text-center max-w-[80px]">
                  <p className="text-xs text-white/90 font-sans">{platform.title}</p>
                  {platform.actions && platform.actions.length > 0 && (
                    <p className="text-[10px] text-white/60 font-sans">
                      {platform.actions.map(action =>
                        action.charAt(0) + action.slice(1).toLowerCase()
                      ).join(", ")}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
