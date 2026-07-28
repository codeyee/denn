import {
  Cloud,
  Computer,
  Gamepad,
  Gamepad2,
  Globe,
  GraduationCap,
  Joystick,
  RectangleGoggles,
  Smartphone,
  Turntable,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface PlatformGroupConfig {
  label: string;
  image: string | null;
  icon?: LucideIcon | null;
  order: number;
}

const PLATFORM_GROUP_IMAGE_PATH = "/images/platform-groups";
const PLAYSTATION_IMAGE = `${PLATFORM_GROUP_IMAGE_PATH}/playstation.webp`;
const XBOX_IMAGE = `${PLATFORM_GROUP_IMAGE_PATH}/xbox.webp`;
const WINDOWS_IMAGE = `${PLATFORM_GROUP_IMAGE_PATH}/windows.webp`;
const LINUX_IMAGE = `${PLATFORM_GROUP_IMAGE_PATH}/linux.webp`;
const MAC_IMAGE = `${PLATFORM_GROUP_IMAGE_PATH}/mac.webp`;
const ANDROID_IMAGE = `${PLATFORM_GROUP_IMAGE_PATH}/android.webp`;
const IOS_IMAGE = `${PLATFORM_GROUP_IMAGE_PATH}/ios.webp`;
const ATARI_IMAGE = `${PLATFORM_GROUP_IMAGE_PATH}/atari.webp`;
const SEGA_IMAGE = `${PLATFORM_GROUP_IMAGE_PATH}/sega.webp`;
const NEO_GEO_IMAGE = `${PLATFORM_GROUP_IMAGE_PATH}/neo_geo.webp`;
const NINTENDO_IMAGE = `${PLATFORM_GROUP_IMAGE_PATH}/nintendo.webp`;
const NINTENDO_SWITCH_IMAGE = `${PLATFORM_GROUP_IMAGE_PATH}/nintendo_switch.webp`;
const NINTENDO_WII_IMAGE = `${PLATFORM_GROUP_IMAGE_PATH}/nintendo_wii.webp`;
const NINTENDO_3DS_IMAGE = `${PLATFORM_GROUP_IMAGE_PATH}/nintendo_3ds.webp`;
const NINTENDO_DS_IMAGE = `${PLATFORM_GROUP_IMAGE_PATH}/nintendo_ds.webp`;
const NINTENDO_GAMEBOY_IMAGE = `${PLATFORM_GROUP_IMAGE_PATH}/nintendo_gameboy.webp`;
const NINTENDO_GAMECUBE_IMAGE = `${PLATFORM_GROUP_IMAGE_PATH}/nintendo_gamecube.webp`;
const NINTENDO_N64_IMAGE = `${PLATFORM_GROUP_IMAGE_PATH}/nintendo_n64.webp`;
const NINTENDO_NES_IMAGE = `${PLATFORM_GROUP_IMAGE_PATH}/nintendo_nes.webp`;
const NINTENDO_SNES_IMAGE = `${PLATFORM_GROUP_IMAGE_PATH}/nintendo_snes.webp`;

export const PLATFORM_GROUP_CONFIG = {
  playstation: { label: "PlayStation", image: PLAYSTATION_IMAGE, order: 10 },
  xbox: { label: "Xbox", image: XBOX_IMAGE, order: 20 },
  windows: { label: "Windows", image: WINDOWS_IMAGE, order: 30 },
  linux: { label: "Linux", image: LINUX_IMAGE, order: 40 },
  mac: { label: "Mac", image: MAC_IMAGE, order: 50 },
  browser: { label: "Web browser", image: null, icon: Globe, order: 60 },
  android: { label: "Android", image: ANDROID_IMAGE, order: 70 },
  ios: { label: "iOS", image: IOS_IMAGE, order: 80 },
  vr: { label: "Virtual reality", image: null, icon: RectangleGoggles, order: 90 },
  cloud_gaming: { label: "Cloud gaming", image: null, icon: Cloud, order: 100 },
  arcade: { label: "Arcade", image: null, icon: Joystick, order: 110 },
  atari: { label: "Atari", image: ATARI_IMAGE, order: 120 },
  sega: { label: "Sega", image: SEGA_IMAGE, order: 130 },
  neo_geo: { label: "Neo Geo", image: NEO_GEO_IMAGE, order: 140 },
  nintendo: { label: "Nintendo", image: NINTENDO_IMAGE, order: 150 },
  nintendo_switch: { label: "Nintendo Switch", image: NINTENDO_SWITCH_IMAGE, order: 160 },
  nintendo_wii: { label: "Nintendo Wii", image: NINTENDO_WII_IMAGE, order: 170 },
  nintendo_3ds: { label: "Nintendo 3DS", image: NINTENDO_3DS_IMAGE, order: 180 },
  nintendo_ds: { label: "Nintendo DS", image: NINTENDO_DS_IMAGE, order: 190 },
  nintendo_gameboy: { label: "Nintendo Game Boy", image: NINTENDO_GAMEBOY_IMAGE, order: 200 },
  nintendo_gamecube: { label: "Nintendo GameCube", image: NINTENDO_GAMECUBE_IMAGE, order: 210 },
  nintendo_n64: { label: "Nintendo 64", image: NINTENDO_N64_IMAGE, order: 220 },
  nintendo_nes: { label: "Nintendo NES", image: NINTENDO_NES_IMAGE, order: 230 },
  nintendo_snes: { label: "Super Nintendo", image: NINTENDO_SNES_IMAGE, order: 240 },
  retro_console: { label: "Retro console", image: null, icon: Gamepad, order: 250 },
  retro_handheld: { label: "Retro handheld", image: null, icon: Turntable, order: 260 },
  retro_computer: { label: "Retro computer", image: null, icon: Computer, order: 270 },
  mobile_legacy: { label: "Legacy mobile", image: null, icon: Smartphone, order: 280 },
  educational: { label: "Educational", image: null, icon: GraduationCap, order: 290 },
  other: { label: "Other", image: null, icon: Gamepad2, order: 300 },
} satisfies Record<string, PlatformGroupConfig>;

const UNKNOWN_GROUP_ORDER = 10000;

export function getPlatformGroupConfig(group: string | null | undefined): PlatformGroupConfig {
  if (group && group in PLATFORM_GROUP_CONFIG) {
    return PLATFORM_GROUP_CONFIG[group as keyof typeof PLATFORM_GROUP_CONFIG];
  }

  return {
    label: group ? humanizeGroup(group) : "Unknown platform",
    image: null,
    icon: Gamepad2,
    order: UNKNOWN_GROUP_ORDER,
  };
}

function humanizeGroup(group: string): string {
  return group
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
