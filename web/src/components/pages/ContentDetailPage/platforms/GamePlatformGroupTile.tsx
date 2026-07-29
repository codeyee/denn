import type { NormalizedGamePlatformGroup } from "@/lib/platforms/gamePlatforms";
import { PlatformLogo } from "./PlatformLogo";

interface GamePlatformGroupTileProps {
  group: NormalizedGamePlatformGroup;
}

export function GamePlatformGroupTile({ group }: GamePlatformGroupTileProps) {
  return (
    <article className="flex h-full min-h-20 items-start gap-2.5 rounded-lg border border-white/10 bg-white/10 p-3">
      <PlatformLogo
        src={group.image}
        alt={group.label}
        kind="game"
        fallbackIcon={group.icon}
        compact
      />
      <div className="min-w-0">
        <h4 className="truncate text-sm font-semibold text-white">{group.label}</h4>
        <ul className="mt-2 space-y-1 text-xs text-white/70">
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
