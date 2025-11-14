"use client";

import { Platform } from "@/lib/api/types";

interface PlatformTileProps {
  platform: Platform;
}

export default function PlatformTile({ platform }: PlatformTileProps) {
  return (
    <div className="flex flex-col items-center gap-2">
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
            {platform.actions
              .map((action) => action.charAt(0) + action.slice(1).toLowerCase())
              .join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}
