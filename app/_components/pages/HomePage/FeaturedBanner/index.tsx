"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Noise } from "@/app/_components/common/Noise";
import { Content } from "@/lib/types";
import { ContentType } from "@/lib/types";
import { getSourceApi } from "@/lib/utils/contentTypeUtils";
import { navigateToContent } from "@/lib/utils/navigationUtils";
import { useBannerAutoRotation } from "./hooks/useBannerAutoRotation";
import { getBestImageUrl } from "./utils";
import { BannerContent } from "./components/BannerContent";
import { BannerDots } from "./components/BannerDots";

interface FeaturedBannerProps {
  items: Content[];
  autoRotateMs?: number;
}

export function FeaturedBanner({ items, autoRotateMs = 5000 }: FeaturedBannerProps) {
  const router = useRouter();

  const validItems = useMemo(
    () => items.filter((i) => Boolean(getBestImageUrl(i))),
    [items]
  );

  const { index, setIndex } = useBannerAutoRotation({
    itemCount: validItems.length,
    autoRotateMs,
  });

  const handleViewDetails = (item: Content) => {
    const contentType = item.type as ContentType;
    const sourceApi = getSourceApi(contentType);
    const externalId = String(item.id);

    navigateToContent(router, {
      externalId,
      sourceApi,
      contentType,
    });
  };

  if (validItems.length === 0) return null;

  const current = validItems[index];

  return (
    <div className="relative w-full aspect-16/16 md:aspect-16/13 lg:aspect-16/10 xl:aspect-16/7 4xl:aspect-16/5 15xl:aspect-16/3 overflow-hidden mb-6 md:mb-10 rounded-none md:rounded-2xl">
      <div className="absolute inset-0">
        {validItems.map((item, i) => {
          const url = getBestImageUrl(item);
          const isActive = i === index;

          return (
            <div
              key={item.id}
              className="absolute inset-0 bg-center bg-cover transition-opacity duration-500 ease-in-out"
              style={{
                backgroundImage: `url(${url})`,
                opacity: isActive ? 1 : 0,
                zIndex: isActive ? 1 : 0
              }}
            />
          );
        })}
      </div>

      <div className="absolute inset-0 pointer-events-none z-10">
        <Noise patternAlpha={15} patternRefreshInterval={2} />
      </div>

      <div className="absolute inset-0 bg-black/35 z-20" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/90 via-black/50 to-transparent z-20" />
      <div
        className="absolute inset-x-0 bottom-0 h-28 md:h-36 z-20"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0) 0%, var(--color-background-logged-in) 100%)",
        }}
      />

      <BannerContent item={current} onViewDetails={handleViewDetails} />

      <BannerDots
        itemCount={validItems.length}
        currentIndex={index}
        onIndexChange={setIndex}
      />
    </div>
  );
}
