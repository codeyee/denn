import type { NormalizedContentPlatform } from "@/lib/platforms/contentPlatforms";
import { PlatformLogo } from "./PlatformLogo";

interface ContentPlatformTileProps {
  platform: NormalizedContentPlatform;
}

export function ContentPlatformTile({ platform }: ContentPlatformTileProps) {
  return (
    <article className="flex h-full min-h-24 items-start gap-3 rounded-lg bg-white/5 p-4">
      <PlatformLogo src={platform.logoUrl} alt={platform.name} kind="content" />
      <div className="min-w-0">
        <h4 className="truncate text-sm font-semibold text-white">{platform.name}</h4>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {platform.actions.map((action) =>
            action.urls.length > 0 ? (
              action.urls.map((url, index) => (
                <PlatformActionBadge
                  key={`${action.key}-${url}`}
                  action={action}
                  platformName={platform.name}
                  url={url}
                  urlIndex={index}
                />
              ))
            ) : (
              <PlatformActionBadge key={action.key} action={action} platformName={platform.name} />
            ),
          )}
        </div>
      </div>
    </article>
  );
}

interface PlatformActionBadgeProps {
  action: NormalizedContentPlatform["actions"][number];
  platformName: string;
  url?: string;
  urlIndex?: number;
}

function PlatformActionBadge({
  action,
  platformName,
  url,
  urlIndex = 0,
}: PlatformActionBadgeProps) {
  const ActionIcon = action.icon;
  const className =
    "inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-1 text-[11px] font-medium text-white/80";
  const label = `${action.label}${urlIndex > 0 ? ` ${urlIndex + 1}` : ""} — ${platformName}`;

  if (!url) {
    return (
      <span className={className}>
        <ActionIcon aria-hidden="true" className="size-3" />
        {action.label}
      </span>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={`${className} transition-colors hover:bg-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70`}
    >
      <ActionIcon aria-hidden="true" className="size-3" />
      {action.label}
    </a>
  );
}
