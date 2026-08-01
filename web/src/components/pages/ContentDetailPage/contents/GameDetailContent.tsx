
import { GameDetail } from "@/lib/types";
import { groupGamePlatforms } from "@/lib/platforms/gamePlatforms";
import { formatReleaseDate } from "@/lib/utils/dateUtils";
import { formatAuthors } from "@/lib/utils/authorUtils";
import { cn } from "@/lib/utils/tailwindUtils";
import { GamePlatformsDisplay } from "../platforms/GamePlatformsDisplay";
import { getGameDurationRows } from "@/lib/utils/gameDuration";
import { BookOpen, Clock3, Trophy, type LucideIcon } from "lucide-react";

const DURATION_ICONS: Record<string, LucideIcon> = {
  Rushed: Clock3,
  Normal: BookOpen,
  Complete: Trophy,
};

interface GameDetailContentProps {
  game: GameDetail;
}

export function GameDetailContent({ game }: GameDetailContentProps) {
  const releaseDate = formatReleaseDate(game.release_date);
  const durationRows = getGameDurationRows(game.duration);

  const platformGroups = groupGamePlatforms(game.platforms, game.distribution_networks);
  const hasPlatforms = platformGroups.length > 0;

  return (
    <div className="layout-content mt-8">
      <h2 className="text-2xl font-bold text-white mb-6">About</h2>

      {/* About layout */}
      <div className={cn("grid grid-cols-1 gap-8", hasPlatforms && "lg:grid-cols-3")}>
        {/* Left column - Description */}
        <div className={cn(hasPlatforms && "lg:col-span-2")}>
          {game.description && (
            <p className="text-gray-300 mb-6 leading-relaxed font-sans">
              {game.description}
            </p>
          )}

          {durationRows.length > 0 && (
            <section className="mb-8" aria-labelledby="estimated-play-time-heading">
              <h3
                id="estimated-play-time-heading"
                className="text-lg font-bold text-white mb-3"
              >
                Estimated play time
              </h3>
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {durationRows.map(({ label, value }) => {
                  const Icon = DURATION_ICONS[label] ?? Clock3;

                  return (
                    <div
                      key={label}
                      className="flex min-h-20 items-center gap-2.5 rounded-lg border border-white/10 bg-white/10 p-3"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-white/10">
                        <Icon aria-hidden="true" className="size-5 text-white/80" strokeWidth={1.75} />
                      </span>
                      <div className="min-w-0">
                        <dt className="text-sm font-semibold text-white">{label}</dt>
                        <dd className="mt-1 text-base font-bold text-white">~{value}</dd>
                      </div>
                    </div>
                  );
                })}
              </dl>
              {game.duration?.status === "stale" && (
                <p className="mt-3 flex items-center gap-2 text-xs text-yellow-300/85">
                  <Clock3 aria-hidden="true" className="size-3.5" />
                  Estimate may be out of date.
                </p>
              )}
            </section>
          )}

          <div className="space-y-2">
            {releaseDate && (
              <div>
                <span className="text-white/60 font-bold">Release Date:</span>
                <span className="text-white ml-2 font-sans">{releaseDate}</span>
              </div>
            )}
            {game.authors && game.authors.length > 0 && (
              <div>
                <span className="text-white/60 font-bold">Developers:</span>
                <span className="text-white ml-2 font-sans">
                  {formatAuthors(game.authors)}
                </span>
              </div>
            )}
            {game.genres && game.genres.length > 0 && (
              <div>
                <span className="text-white/60 font-bold">Genres:</span>
                <span className="text-white ml-2 font-sans">
                  {game.genres.join(", ")}
                </span>
              </div>
            )}
            {game.themes && game.themes.length > 0 && (
              <div>
                <span className="text-white/60 font-bold">Themes:</span>
                <span className="text-white ml-2 font-sans">
                  {game.themes.join(", ")}
                </span>
              </div>
            )}
            {game.game_modes && game.game_modes.length > 0 && (
              <div>
                <span className="text-white/60 font-bold">Game Modes:</span>
                <span className="text-white ml-2 font-sans">
                  {game.game_modes.join(", ")}
                </span>
              </div>
            )}
          </div>
        </div>

        {hasPlatforms && (
          <div className="lg:col-span-1">
            <GamePlatformsDisplay groups={platformGroups} />
          </div>
        )}
      </div>
    </div>
  );
}
