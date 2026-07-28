import type { NormalizedGamePlatformGroup } from "@/lib/platforms/gamePlatforms";
import { PlatformLogo } from "./PlatformLogo";

interface GamePlatformGroupTileProps {
  group: NormalizedGamePlatformGroup;
}

export function GamePlatformGroupTile({ group }: GamePlatformGroupTileProps) {
  return (
    <article className="flex h-full min-h-24 items-start gap-3 rounded-lg bg-white/5 p-4">
      <PlatformLogo
        src={group.image}
        alt={group.label}
        kind="game"
        fallbackIcon={group.icon}
      />
      <div className="min-w-0">
        <h4 className="truncate text-sm font-semibold text-white">{group.label}</h4>
        <ul className="mt-3 space-y-1 text-xs text-white/70">
          {group.platforms.map((platform) => (
            <li key={platform.matchedName ?? platform.originalName} className="truncate">
              {platform.originalName}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
