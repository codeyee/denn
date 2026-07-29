
import { GameDetail } from "@/lib/types";
import { groupGamePlatforms } from "@/lib/platforms/gamePlatforms";
import { formatReleaseDate } from "@/lib/utils/dateUtils";
import { formatAuthors } from "@/lib/utils/authorUtils";
import { GamePlatformsDisplay } from "../platforms/GamePlatformsDisplay";
import { getGameDurationRows } from "@/lib/utils/gameDuration";

interface GameDetailContentProps {
  game: GameDetail;
}

export function GameDetailContent({ game }: GameDetailContentProps) {
  const releaseDate = formatReleaseDate(game.release_date);
  const durationRows = getGameDurationRows(game.duration);

  const platformGroups = groupGamePlatforms(game.platforms, game.distribution_networks);

  return (
    <div className="layout-content mt-8">
      <h2 className="text-2xl font-bold text-white mb-6">About</h2>

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column - Description */}
        <div className="lg:col-span-2">
          {game.description && (
            <p className="text-gray-300 mb-6 leading-relaxed font-sans">
              {game.description}
            </p>
          )}

          {game.duration && (
            <section className="mb-8" aria-labelledby="estimated-play-time-heading">
              <h3
                id="estimated-play-time-heading"
                className="text-lg font-bold text-white mb-3"
              >
                Estimated play time
              </h3>
              {durationRows.length > 0 ? (
                <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {durationRows.map(({ label, value }) => (
                    <div key={label} className="border-l border-white/15 pl-3">
                      <dt className="text-sm text-white/60">{label}</dt>
                      <dd className="mt-1 text-white font-semibold">~{value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-white/55">
                  {game.duration.status === "error"
                    ? "Estimated play time is temporarily unavailable."
                    : "Estimated play time unavailable."}
                </p>
              )}
              <p className="mt-3 text-xs text-white/45">
                Approximate community averages from {game.duration.source.toUpperCase()}.
                {game.duration.status === "stale" && " This estimate may be out of date."}
              </p>
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

        {/* Right column - Where to Play */}
        <div className="lg:col-span-1">
          <GamePlatformsDisplay groups={platformGroups} />
        </div>
      </div>
    </div>
  );
}
