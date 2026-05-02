
import { Platform } from "@/lib/types";
import { useSettingsStore } from "@/stores/settings-store";
import { DEFAULT_COUNTRY } from "@/lib/utils/countryUtils";
import { PlatformActionGroup } from "./PlatformActionGroup";
import { hasFilteredPlatforms } from "./filterPlatforms";

interface PlatformsDisplayProps {
  platforms: Record<string, Platform[]>;
  title?: string;
}

const ACTION_LABELS: Record<string, string> = {
  stream: "Stream",
  rent: "Rent",
  buy: "Buy",
  platforms: "Available On",
};

export function PlatformsDisplay({
  platforms,
  title = "Where to Watch",
}: PlatformsDisplayProps) {
  const countryCode = useSettingsStore((s) => s.countryCode) || DEFAULT_COUNTRY;

  if (Object.keys(platforms).length === 0) return null;

  if (!hasFilteredPlatforms(platforms)) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <img
          src={`https://hatscripts.github.io/circle-flags/flags/${countryCode.toLowerCase()}.svg`}
          alt={countryCode}
          title={countryCode}
          width={24}
          height={24}
        />
      </div>

      {Object.entries(platforms).map(([actionType, platformList]) => (
        <PlatformActionGroup
          key={actionType}
          actionLabel={ACTION_LABELS[actionType] || actionType}
          platformList={platformList}
        />
      ))}
    </div>
  );
}
