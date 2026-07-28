
import type { NormalizedContentPlatform } from "@/lib/platforms/contentPlatforms";
import {
  CONTENT_ACTION_FILTER_ALL,
  filterContentPlatformsByAction,
  getAvailableContentActions,
} from "@/lib/platforms/contentPlatforms";
import { useSettingsStore } from "@/stores/settings-store";
import { DEFAULT_COUNTRY } from "@/lib/utils/countryUtils";
import { EmptyState } from "@/components/common/state/EmptyState";
import { ListFilter } from "lucide-react";
import { useMemo, useState } from "react";
import { ContentPlatformTile } from "./ContentPlatformTile";

interface PlatformsDisplayProps {
  platforms: NormalizedContentPlatform[];
  title?: string;
}

export function PlatformsDisplay({
  platforms,
  title = "Where to Watch",
}: PlatformsDisplayProps) {
  const countryCode = useSettingsStore((s) => s.countryCode) || DEFAULT_COUNTRY;
  const [selectedAction, setSelectedAction] = useState(CONTENT_ACTION_FILTER_ALL);
  const availableActions = useMemo(() => getAvailableContentActions(platforms), [platforms]);
  const activeAction = availableActions.some((action) => action.key === selectedAction)
    ? selectedAction
    : CONTENT_ACTION_FILTER_ALL;
  const visiblePlatforms = useMemo(
    () => filterContentPlatformsByAction(platforms, activeAction),
    [activeAction, platforms],
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <img
            src={`https://hatscripts.github.io/circle-flags/flags/${countryCode.toLowerCase()}.svg`}
            alt={countryCode}
            title={countryCode}
            width={24}
            height={24}
          />
        </div>

        {availableActions.length > 1 && (
          <div
            aria-label="Filter platforms by action"
            className="flex flex-wrap items-center gap-1 rounded-lg bg-white/5 p-1"
            role="group"
          >
            <button
              type="button"
              aria-pressed={activeAction === CONTENT_ACTION_FILTER_ALL}
              onClick={() => setSelectedAction(CONTENT_ACTION_FILTER_ALL)}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 aria-pressed:bg-white/15 aria-pressed:text-white"
            >
              <ListFilter aria-hidden="true" className="size-3.5" />
              All
            </button>
            {availableActions.map((action) => {
              const ActionIcon = action.icon;
              return (
                <button
                  key={action.key}
                  type="button"
                  aria-pressed={activeAction === action.key}
                  onClick={() => setSelectedAction(action.key)}
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 aria-pressed:bg-white/15 aria-pressed:text-white"
                >
                  <ActionIcon aria-hidden="true" className="size-3.5" />
                  {action.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {platforms.length > 0 ? (
        <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2">
          {visiblePlatforms.map((platform) => (
            <ContentPlatformTile key={platform.key} platform={platform} />
          ))}
        </div>
      ) : (
        <EmptyState compact message="No platforms available." />
      )}
    </div>
  );
}
