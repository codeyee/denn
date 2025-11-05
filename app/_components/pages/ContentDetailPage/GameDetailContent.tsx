"use client";

import { GameDetail } from "@/lib/api/types";
import { formatReleaseDate } from "@/lib/utils/dateUtils";

interface GameDetailContentProps {
  game: GameDetail;
}

export default function GameDetailContent({ game }: GameDetailContentProps) {
  const releaseDate = formatReleaseDate(game.release_date);

  // Combine artworks and screenshots into a single gallery array
  const galleryImages = [
    ...(game.images?.artworks?.map((artwork, index) => ({
      src: artwork.standard || artwork.original,
      alt: `${game.title} artwork ${index + 1}`,
      type: "artwork" as const,
    })) || []),
    ...(game.images?.screenshots?.map((screenshot, index) => ({
      src: screenshot.standard || screenshot.original,
      alt: `${game.title} screenshot ${index + 1}`,
      type: "screenshot" as const,
    })) || []),
  ];

  return (
    <>
      <div className="container mx-auto px-4">
        <div className="mb-10 py-5 text-lg">
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">About</h2>
            {game.description && (
              <p className="text-gray-300 mb-4 leading-relaxed font-sans">{game.description}</p>
            )}

            <div className="my-6 space-y-2">
              {releaseDate && (
                <div>
                  <span className="text-white/60 font-bold">Release Date:</span>
                  <span className="text-white ml-2 font-sans">{releaseDate}</span>
                </div>
              )}
              {game.authors && game.authors.length > 0 && (
                <div>
                  <span className="text-white/60 font-bold">Developers:</span>
                  <span className="text-white ml-2 font-sans">{game.authors.join(", ")}</span>
                </div>
              )}
              {game.platforms && game.platforms.length > 0 && (
                <div>
                  <span className="text-white/60 font-bold">Platforms:</span>
                  <span className="text-white ml-2 font-sans">{game.platforms.join(", ")}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Gallery */}
      {galleryImages.length > 0 && (
        <div className="p-6 md:p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Artworks & Screenshots</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {galleryImages.map((image, index) => (
              <div
                key={index}
                className="relative overflow-hidden rounded-2xl"
                style={{ aspectRatio: "16 / 9" }}
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
