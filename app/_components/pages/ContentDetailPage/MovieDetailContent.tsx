"use client";

import { MovieDetail } from "@/lib/api/types";
import { formatReleaseDate } from "@/lib/utils/dateUtils";

interface MovieDetailContentProps {
  movie: MovieDetail;
}

export default function MovieDetailContent({ movie }: MovieDetailContentProps) {
  const releaseDate = formatReleaseDate(movie.release_date);

  return (
    <div className="container mx-auto px-4">
      <div className="mb-10 text-lg">
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">About</h2>
          {movie.tagline && (
            <p className="text-white/80 italic mb-4 font-sans">"{movie.tagline}"</p>
          )}
          {movie.description && (
            <p className="text-gray-300 mb-4 leading-relaxed font-sans">{movie.description}</p>
          )}

          <div className="my-6 space-y-2">
            {releaseDate && (
              <div>
                <span className="text-white/60 font-bold">Release Date:</span>
                <span className="text-white ml-2 font-sans">{releaseDate}</span>
              </div>
            )}
            {movie.duration_minutes && (
              <div>
                <span className="text-white/60 font-bold">Duration:</span>
                <span className="text-white ml-2 font-sans">{movie.duration_minutes} minutes</span>
              </div>
            )}
            {movie.status && movie.status !== "Released" && (
              <div>
                <span className="text-white/60 font-bold">Status:</span>
                <span className="text-white ml-2 font-sans">{movie.status}</span>
              </div>
            )}
          </div>

          {movie.imdb_id && (
            <div className="flex flex-row gap-2">
              <a
                href={`https://www.imdb.com/title/${movie.imdb_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-row gap-2 hover:opacity-80 transition-opacity cursor-pointer"
              >
                <img
                  src="/images/logos/imdb.svg"
                  alt="IMDb"
                  className="h-7 w-auto"
                />
              </a>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

