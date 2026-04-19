"use client";

import { Platform } from "@/lib/types";

const EXCLUDE_TERMS = [
  "Amazon Channel",
  "Apple TV Channel",
  "Roku Premium Channel",
  "with Ads",
];

export const filterPlatforms = (platformList: Platform[]) => {
  return platformList.filter((platform) => {
    return !EXCLUDE_TERMS.some((term) =>
      platform.name.toLowerCase().includes(term.toLowerCase())
    );
  });
};

export const hasFilteredPlatforms = (platforms: Record<string, Platform[]>) =>
  Object.values(platforms).some(
    (platformList) => filterPlatforms(platformList).length > 0
  );
