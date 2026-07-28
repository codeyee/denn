
import { GameDetail } from "@/lib/types";
import { groupGamePlatforms } from "@/lib/platforms/gamePlatforms";
import { formatReleaseDate } from "@/lib/utils/dateUtils";
import { formatAuthors } from "@/lib/utils/authorUtils";
import { GamePlatformsDisplay } from "../platforms/GamePlatformsDisplay";

interface GameDetailContentProps {
  game: GameDetail;
}

export function GameDetailContent({ game }: GameDetailContentProps) {
  const releaseDate = formatReleaseDate(game.release_date);

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
