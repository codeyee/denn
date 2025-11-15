"use client";

import { GameDetail, Platform } from "@/lib/types";
import { formatReleaseDate } from "@/lib/utils/dateUtils";
import { formatAuthors } from "@/lib/utils/authorUtils";
import { PlatformsDisplay } from "../platforms/PlatformsDisplay";

interface GameDetailContentProps {
  game: GameDetail;
}

export function GameDetailContent({ game }: GameDetailContentProps) {
  const releaseDate = formatReleaseDate(game.release_date);

  // Convert game platforms to the format expected by PlatformsDisplay
  // Use empty string as country code since games don't have regional platforms
  const platformsByCountry: Record<string, Platform[]> =
    game.platforms && game.platforms.length > 0 ? { "": game.platforms } : {};

  return (
    <div className="container mx-auto px-4 mt-8">
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
          </div>
        </div>

        {/* Right column - Where to Play */}
        <div className="lg:col-span-1">
          <PlatformsDisplay
            platforms={platformsByCountry}
            title="Where to Play"
          />
        </div>
      </div>
    </div>
  );
}
