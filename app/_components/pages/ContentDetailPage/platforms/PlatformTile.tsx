"use client";

import Image from "next/image";
import { Platform } from "@/lib/types";
import { getPlatformImageUrl } from "@/lib/utils/platformUtils";

interface PlatformTileProps {
  platform: Platform;
}

export function PlatformTile({ platform }: PlatformTileProps) {
  const imageUrl = getPlatformImageUrl(platform.name, platform.image_url);

  return (
    <div className="flex flex-col items-center gap-2 w-[72px]">
      <div className="w-14 h-14 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={platform.name}
            width={56}
            height={56}
            className="w-full h-full object-cover"
            unoptimized={imageUrl.startsWith('https://upload.wikimedia.org')}
          />
        )}
      </div>
      <p className="text-xs text-white/90 font-sans text-center line-clamp-2">{platform.name}</p>
    </div>
  );
}
