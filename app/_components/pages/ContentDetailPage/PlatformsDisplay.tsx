"use client";

import { Platform } from "@/lib/api/types";

interface PlatformsDisplayProps {
  platforms: Record<string, Platform[]>;
  title?: string;
}

export default function PlatformsDisplay({ platforms, title = "Where to Watch" }: PlatformsDisplayProps) {
  if (Object.keys(platforms).length === 0) return null;

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      {Object.entries(platforms).map(([countryCode, platformList]) => (
        <div key={countryCode} className="mb-6">
          {countryCode && <h4 className="text-sm font-medium text-white/70 mb-3">{countryCode}</h4>}
          <div className="flex flex-wrap gap-3">
            {platformList.map((platform, index) => (
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
