import type { NormalizedGamePlatformGroup } from "@/lib/platforms/gamePlatforms";
import { GamePlatformGroupTile } from "./GamePlatformGroupTile";

interface GamePlatformsDisplayProps {
  groups: NormalizedGamePlatformGroup[];
  title?: string;
}

export function GamePlatformsDisplay({ groups, title = "Where to Play" }: GamePlatformsDisplayProps) {
  if (groups.length === 0) return null;

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold text-white">{title}</h3>
      <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2">
        {groups.map((group) => (
          <GamePlatformGroupTile key={group.key} group={group} />
        ))}
      </div>
    </div>
  );
}
