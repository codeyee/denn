"use client";

import { Platform } from "@/lib/api/types";

export const filterPlatforms = (platformList: Platform[]) => {
  const excludeTerms = [
    "Amazon Channel",
    "Apple TV Channel",
    "Roku Premium Channel",
    "with Ads",
  ];

  return platformList.filter((platform) => {
    return !excludeTerms.some((term) =>
      platform.title.toLowerCase().includes(term.toLowerCase())
    );
  });
};

export const hasFilteredPlatforms = (platforms: Record<string, Platform[]>) =>
  Object.values(platforms).some(
    (platformList) => filterPlatforms(platformList).length > 0
  );
