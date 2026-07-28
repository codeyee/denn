import type { Platform } from "@/lib/types";
import { Gamepad2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import platformClassification from "@/data/video-game-platforms-with-suggested-group.json";
import { getPlatformGroupConfig } from "./platformGroupConfig";
import { normalizeLookupValue } from "./contentPlatforms";

interface GamePlatformRecord {
  name: string;
  most_recent_version: string | null;
  suggested_group: string;
}

export interface NormalizedGamePlatform {
  originalName: string;
  matchedName?: string;
  suggestedGroup?: string;
  groupLabel: string;
  groupImage: string | null;
  groupIcon: LucideIcon;
  groupOrder: number;
  mostRecentVersion?: string | null;
  isKnown: boolean;
}

export interface NormalizedGamePlatformGroup {
  key: string;
  label: string;
  image: string | null;
  icon: LucideIcon;
  order: number;
  isKnown: boolean;
  platforms: NormalizedGamePlatform[];
}

const RECORDS: GamePlatformRecord[] = [
  ...platformClassification.video_game_platforms,
  ...platformClassification.distribution_networks,
];

const EXACT_RECORDS = new Map(RECORDS.map((record) => [record.name, record]));
const NORMALIZED_RECORDS = new Map<string, GamePlatformRecord>();

for (const record of RECORDS) {
  const key = normalizeLookupValue(record.name);
  if (!NORMALIZED_RECORDS.has(key)) NORMALIZED_RECORDS.set(key, record);
}

export function resolveGamePlatform(name: string): NormalizedGamePlatform {
  const originalName = name.trim();
  const record = EXACT_RECORDS.get(originalName) ?? NORMALIZED_RECORDS.get(normalizeLookupValue(originalName));

  if (!record) {
    return {
      originalName,
      groupLabel: originalName || "Unknown platform",
      groupImage: null,
      groupIcon: Gamepad2,
      groupOrder: 10000,
      isKnown: false,
    };
  }

  const config = getPlatformGroupConfig(record.suggested_group);
  return {
    originalName,
    matchedName: record.name,
    suggestedGroup: record.suggested_group,
    groupLabel: config.label,
    groupImage: config.image,
    groupIcon: config.icon ?? Gamepad2,
    groupOrder: config.order,
    mostRecentVersion: record.most_recent_version,
    isKnown: true,
  };
}

export function groupGamePlatforms(
  platforms: Platform[] | null | undefined,
  distributionNetworks: Platform[] | null | undefined = [],
): NormalizedGamePlatformGroup[] {
  const grouped = new Map<string, NormalizedGamePlatformGroup>();

  for (const platform of [...(platforms ?? []), ...(distributionNetworks ?? [])]) {
    const resolved = resolveGamePlatform(platform.name);
    const platformKey = normalizeLookupValue(resolved.matchedName ?? resolved.originalName);
    const groupKey = resolved.isKnown
      ? `known:${resolved.suggestedGroup}`
      : `unknown:${platformKey}`;
    const group = grouped.get(groupKey) ?? createGroup(groupKey, resolved);

    if (!group.platforms.some((item) => normalizeLookupValue(item.matchedName ?? item.originalName) === platformKey)) {
      group.platforms.push(resolved);
    }
    grouped.set(groupKey, group);
  }

  return [...grouped.values()]
    .map((group) => ({
      ...group,
      platforms: [...group.platforms].sort(compareGamePlatforms),
    }))
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
}

function createGroup(key: string, platform: NormalizedGamePlatform): NormalizedGamePlatformGroup {
  return {
    key,
    label: platform.groupLabel,
    image: platform.groupImage,
    icon: platform.groupIcon,
    order: platform.groupOrder,
    isKnown: platform.isKnown,
    platforms: [],
  };
}

function compareGamePlatforms(a: NormalizedGamePlatform, b: NormalizedGamePlatform): number {
  const aDate = a.mostRecentVersion ?? "";
  const bDate = b.mostRecentVersion ?? "";
  if (aDate && bDate && aDate !== bDate) return bDate.localeCompare(aDate);
  if (aDate !== bDate) return aDate ? -1 : 1;
  return a.originalName.localeCompare(b.originalName);
}
