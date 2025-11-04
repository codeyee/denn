"use client";

import { GameDetail } from "@/lib/api/types";

interface GameDetailContentProps {
  game: GameDetail;
}

export default function GameDetailContent({ game }: GameDetailContentProps) {
  return (
    <>
      <div className="bg-white/5 rounded-2xl p-6 md:p-8 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">About</h2>
            {game.description && (
              <p className="text-gray-300 mb-4 leading-relaxed">{game.description}</p>
            )}

            <div className="mt-6 space-y-2">
              {game.release_date && (
                <div>
                  <span className="text-white/60 text-sm">Release Date:</span>
                  <span className="text-white ml-2">{game.release_date}</span>
                </div>
              )}
              {game.type && (
                <div>
                  <span className="text-white/60 text-sm">Type:</span>
                  <span className="text-white ml-2 capitalize">{game.type}</span>
                </div>
              )}
              {game.authors && game.authors.length > 0 && (
                <div>
                  <span className="text-white/60 text-sm">Developers:</span>
                  <span className="text-white ml-2">{game.authors.join(", ")}</span>
                </div>
              )}
              {game.platforms && game.platforms.length > 0 && (
                <div>
                  <span className="text-white/60 text-sm">Platforms:</span>
                  <span className="text-white ml-2">{game.platforms.join(", ")}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Images */}
          {game.images && (
            <div>
              {game.images.screenshots && game.images.screenshots.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Screenshots</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {game.images.screenshots.slice(0, 4).map((screenshot, index) => (
                      <img
                        key={index}
                        src={screenshot.standard || screenshot.original}
                        alt={`${game.title} screenshot ${index + 1}`}
                        className="w-full rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              )}
              {game.images.artworks && game.images.artworks.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Artworks</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {game.images.artworks.slice(0, 4).map((artwork, index) => (
                      <img
                        key={index}
                        src={artwork.standard || artwork.original}
                        alt={`${game.title} artwork ${index + 1}`}
                        className="w-full rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
