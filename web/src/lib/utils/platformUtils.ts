export const platformImageOverrides: Record<string, string> = {
  // PlayStation Platforms
  "PlayStation 5":
    "https://upload.wikimedia.org/wikipedia/commons/1/1b/PlayStation_5_and_DualSense_with_transparent_background.png",
  "PlayStation 4":
    "https://upload.wikimedia.org/wikipedia/commons/7/70/PlayStation_logo.svg",
  "PlayStation 3":
    "https://upload.wikimedia.org/wikipedia/commons/7/70/PlayStation_logo.svg",
  "PlayStation 2":
    "https://upload.wikimedia.org/wikipedia/commons/7/70/PlayStation_logo.svg",
  PlayStation:
    "https://upload.wikimedia.org/wikipedia/commons/7/70/PlayStation_logo.svg",
  "PlayStation Portable":
    "https://upload.wikimedia.org/wikipedia/commons/4/46/PSP_Logo.svg",
  "PlayStation Vita":
    "https://upload.wikimedia.org/wikipedia/commons/4/46/PSP_Logo.svg",

  // Xbox Platforms
  "Xbox Series X|S":
    "https://upload.wikimedia.org/wikipedia/commons/d/d7/Xbox_logo_%282019%29.svg",
  "Xbox One":
    "https://upload.wikimedia.org/wikipedia/commons/d/d7/Xbox_logo_%282019%29.svg",
  "Xbox 360":
    "https://upload.wikimedia.org/wikipedia/commons/d/d7/Xbox_logo_%282019%29.svg",
  Xbox: "https://upload.wikimedia.org/wikipedia/commons/d/d7/Xbox_logo_%282019%29.svg",

  // Nintendo Platforms
  "Nintendo Switch":
    "https://upload.wikimedia.org/wikipedia/commons/7/78/Nintendo_Switch_logo.svg",
  "Nintendo Switch 2":
    "https://upload.wikimedia.org/wikipedia/commons/7/78/Nintendo_Switch_logo.svg",
  "Wii U":
    "https://upload.wikimedia.org/wikipedia/commons/9/97/Nintendo_red_logo.svg",
  Wii: "https://upload.wikimedia.org/wikipedia/commons/9/97/Nintendo_red_logo.svg",
  "Nintendo GameCube":
    "https://upload.wikimedia.org/wikipedia/commons/9/97/Nintendo_red_logo.svg",
  "Nintendo 64":
    "https://upload.wikimedia.org/wikipedia/commons/9/97/Nintendo_red_logo.svg",
  "Nintendo 3DS":
    "https://upload.wikimedia.org/wikipedia/commons/9/97/Nintendo_red_logo.svg",
  "New Nintendo 3DS":
    "https://upload.wikimedia.org/wikipedia/commons/9/97/Nintendo_red_logo.svg",
  "Nintendo DS":
    "https://upload.wikimedia.org/wikipedia/commons/9/97/Nintendo_red_logo.svg",
  "Nintendo DSi":
    "https://upload.wikimedia.org/wikipedia/commons/9/97/Nintendo_red_logo.svg",

  // PC Platforms
  "PC (Microsoft Windows)":
    "https://upload.wikimedia.org/wikipedia/commons/5/5f/Windows_logo_-_2012.svg",
  Mac: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg",
  Linux: "https://upload.wikimedia.org/wikipedia/commons/3/35/Tux.svg",

  // Mobile Platforms
  Android:
    "https://upload.wikimedia.org/wikipedia/commons/d/d7/Android_robot.svg",
  iOS: "https://upload.wikimedia.org/wikipedia/commons/6/67/App_Store_%28iOS%29.svg",

  // VR Platforms
  "PlayStation VR":
    "https://upload.wikimedia.org/wikipedia/commons/7/70/PlayStation_logo.svg",
  "PlayStation VR2":
    "https://upload.wikimedia.org/wikipedia/commons/7/70/PlayStation_logo.svg",
  "Oculus Quest":
    "https://upload.wikimedia.org/wikipedia/commons/3/35/Meta_Quest_logo.svg",
  "Meta Quest 2":
    "https://upload.wikimedia.org/wikipedia/commons/3/35/Meta_Quest_logo.svg",
  "Meta Quest 3":
    "https://upload.wikimedia.org/wikipedia/commons/3/35/Meta_Quest_logo.svg",
  "Oculus Rift":
    "https://upload.wikimedia.org/wikipedia/commons/3/35/Meta_Quest_logo.svg",
  SteamVR:
    "https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg",
  "Oculus VR":
    "https://upload.wikimedia.org/wikipedia/commons/3/35/Meta_Quest_logo.svg",
};

export function getPlatformImageUrl(
  platformName: string,
  originalImageUrl: string | null
): string | null {
  const override = platformImageOverrides[platformName];
  return override ?? originalImageUrl;
}
