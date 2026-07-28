import {
  CircleHelp,
  Gift,
  Megaphone,
  Play,
  ShoppingCart,
  Ticket,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Platform } from "@/lib/types";

export type ContentPlatformActionKey = string;
export const CONTENT_ACTION_FILTER_ALL = "all";

export interface NormalizedContentPlatformAction {
  key: ContentPlatformActionKey;
  label: string;
  order: number;
  icon: LucideIcon;
  urls: string[];
}

export interface NormalizedContentPlatform {
  key: string;
  name: string;
  logoUrl: string | null;
  providerId: string | null;
  priority: number;
  actions: NormalizedContentPlatformAction[];
}

export interface ContentActionConfig {
  label: string;
  order: number;
  icon: LucideIcon;
  aliases: string[];
}

export const CONTENT_ACTION_CONFIG: Record<string, ContentActionConfig> = {
  stream: {
    label: "Stream",
    order: 10,
    icon: Play,
    aliases: ["stream", "streaming", "flatrate", "subscription", "watch"],
  },
  free: {
    label: "Free",
    order: 20,
    icon: Gift,
    aliases: ["free", "gratis"],
  },
  ads: {
    label: "With ads",
    order: 30,
    icon: Megaphone,
    aliases: ["ads", "ad supported", "with ads", "free with ads", "stream with ads"],
  },
  buy: {
    label: "Buy",
    order: 40,
    icon: ShoppingCart,
    aliases: ["buy", "purchase", "buying"],
  },
  rent: {
    label: "Rent",
    order: 50,
    icon: Ticket,
    aliases: ["rent", "rental", "renting"],
  },
};

const ACTION_ALIASES = Object.entries(CONTENT_ACTION_CONFIG).reduce<Record<string, string>>(
  (aliases, [key, config]) => {
    for (const alias of config.aliases) {
      aliases[normalizeLookupValue(alias)] = key;
    }
    return aliases;
  },
  {},
);

const PROVIDER_ALIASES: Record<string, string> = {
  "amazon prime": "amazon video",
  "amazon prime video": "amazon video",
  "google play movies tv": "google play",
  "google play movies and tv": "google play",
  "apple tv plus": "apple tv",
};

const PROVIDER_PRIORITIES: Record<string, number> = {
  netflix: 10,
  "amazon video": 20,
  "disney plus": 30,
  "apple tv": 40,
  crunchyroll: 50,
  "google play": 60,
};

const EXCLUDED_PROVIDER_MARKERS = [
  "amazon channel",
  "apple tv channel",
  "roku premium channel",
  "with ads",
];

const UNKNOWN_ACTION_ORDER = 1000;

export function normalizeContentPlatforms(
  platforms: Record<string, Platform[]> | null | undefined,
): NormalizedContentPlatform[] {
  const grouped = new Map<string, NormalizedContentPlatform>();
  const providerIds = new Map<string, string>();
  const providerNames = new Map<string, string[]>();

  for (const [rawAction, platformList] of Object.entries(platforms ?? {})) {
    const action = normalizeContentAction(rawAction);
    for (const platform of platformList ?? []) {
      const name = platform.name.trim();
      if (!name || isExcludedProvider(name)) continue;

      const providerNameKey = normalizeProviderKey(name);
      const providerId = getProviderId(platform);
      const existingKey = findExistingProviderKey(providerId, providerNameKey, providerIds, providerNames);
      const key = existingKey ?? createProviderKey(providerId, providerNameKey, grouped);
      let normalized = grouped.get(key);

      if (!normalized) {
        normalized = {
          key,
          name,
          logoUrl: platform.image_url || null,
          providerId,
          priority: PROVIDER_PRIORITIES[providerNameKey] ?? 500,
          actions: [],
        };
        grouped.set(key, normalized);
        addProviderNameKey(providerNames, providerNameKey, key);
        if (providerId) providerIds.set(providerId, key);
      } else {
        normalized.logoUrl ||= platform.image_url || null;
        normalized.providerId ||= providerId;
        if (providerId) providerIds.set(providerId, key);
      }

      mergePlatformAction(normalized, action, getValidPlatformUrl(platform));
    }
  }

  return [...grouped.values()]
    .map((platform) => ({
      ...platform,
      actions: [...platform.actions].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label)),
    }))
    .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
}

export function getAvailableContentActions(
  platforms: NormalizedContentPlatform[],
): NormalizedContentPlatformAction[] {
  const actions = new Map<string, NormalizedContentPlatformAction>();
  for (const platform of platforms) {
    for (const action of platform.actions) {
      if (!actions.has(action.key)) actions.set(action.key, action);
    }
  }

  return [...actions.values()].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
}

export function filterContentPlatformsByAction(
  platforms: NormalizedContentPlatform[],
  actionKey: ContentPlatformActionKey,
): NormalizedContentPlatform[] {
  if (actionKey === CONTENT_ACTION_FILTER_ALL) return platforms;

  return platforms.flatMap((platform) => {
    const actions = platform.actions.filter((action) => action.key === actionKey);
    return actions.length > 0 ? [{ ...platform, actions }] : [];
  });
}

export function normalizeLookupValue(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeProviderKey(name: string): string {
  const normalized = normalizeLookupValue(name);
  return PROVIDER_ALIASES[normalized] ?? normalized;
}

function normalizeContentAction(rawAction: string): NormalizedContentPlatformAction {
  const normalizedAction = normalizeLookupValue(rawAction);
  const key = ACTION_ALIASES[normalizedAction] ?? (normalizedAction || "other");
  const config = CONTENT_ACTION_CONFIG[key];

  return {
    key,
    label: config?.label ?? humanizeAction(normalizedAction || "Other"),
    order: config?.order ?? UNKNOWN_ACTION_ORDER,
    icon: config?.icon ?? CircleHelp,
    urls: [],
  };
}

function mergePlatformAction(
  platform: NormalizedContentPlatform,
  action: NormalizedContentPlatformAction,
  url: string | null,
) {
  const existing = platform.actions.find((candidate) => candidate.key === action.key);
  if (!existing) {
    platform.actions.push({ ...action, urls: url ? [url] : [] });
    return;
  }

  if (url && !existing.urls.includes(url)) existing.urls.push(url);
}

function findExistingProviderKey(
  providerId: string | null,
  providerNameKey: string,
  providerIds: Map<string, string>,
  providerNames: Map<string, string[]>,
): string | null {
  if (providerId) {
    const idMatch = providerIds.get(providerId);
    if (idMatch) return idMatch;
  }

  const nameMatches = providerNames.get(providerNameKey) ?? [];
  return nameMatches.length === 1 ? nameMatches[0] : null;
}

function createProviderKey(
  providerId: string | null,
  providerNameKey: string,
  grouped: Map<string, NormalizedContentPlatform>,
): string {
  const baseKey = providerId ? `id:${providerId}` : `name:${providerNameKey}`;
  if (!grouped.has(baseKey)) return baseKey;

  let suffix = 2;
  while (grouped.has(`${baseKey}:${suffix}`)) suffix += 1;
  return `${baseKey}:${suffix}`;
}

function addProviderNameKey(providerNames: Map<string, string[]>, nameKey: string, providerKey: string) {
  const keys = providerNames.get(nameKey) ?? [];
  if (!keys.includes(providerKey)) keys.push(providerKey);
  providerNames.set(nameKey, keys);
}

function getProviderId(platform: Platform): string | null {
  const id = platform.provider_id ?? platform.providerId ?? platform.id;
  if (id === null || id === undefined || String(id).trim() === "") return null;
  return String(id).trim();
}

function getValidPlatformUrl(platform: Platform): string | null {
  const candidate = platform.url ?? platform.link;
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? candidate : null;
  } catch {
    return null;
  }
}

function isExcludedProvider(name: string): boolean {
  const normalized = normalizeLookupValue(name);
  return EXCLUDED_PROVIDER_MARKERS.some((marker) => normalized.includes(normalizeLookupValue(marker)));
}

function humanizeAction(action: string): string {
  return action
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
