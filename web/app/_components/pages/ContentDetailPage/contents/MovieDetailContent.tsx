"use client";

import Image from "next/image";
import { MovieDetail } from "@/lib/types";
import { formatReleaseDate } from "@/lib/utils/dateUtils";
import { formatAuthors } from "@/lib/utils/authorUtils";
import { PlatformsDisplay } from "../platforms/PlatformsDisplay";

interface MovieDetailContentProps {
  movie: MovieDetail;
}

export function MovieDetailContent({ movie }: MovieDetailContentProps) {
  const releaseDate = formatReleaseDate(movie.release_date);

  const platformsByAction = movie.platforms || {};

  return (
    <div className="container mx-auto px-4 mt-8">
      <h2 className="text-2xl font-bold text-white mb-6">About</h2>

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column - Description */}
        <div className="lg:col-span-2">
          {movie.tagline && (
            <p className="text-white/80 italic mb-4 font-sans">&quot;{movie.tagline}&quot;</p>
          )}
          {movie.description && (
            <p className="text-gray-300 mb-6 leading-relaxed font-sans">{movie.description}</p>
          )}

          <div className="space-y-2">
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
            {movie.status && movie.status.toLowerCase() !== "released" && (
              <div>
                <span className="text-white/60 font-bold">Status:</span>
                <span className="text-white ml-2 font-sans">{movie.status}</span>
              </div>
            )}
            {movie.authors && movie.authors.length > 0 && (
              <div>
                <span className="text-white/60 font-bold">Production:</span>
                <span className="text-white ml-2 font-sans">{formatAuthors(movie.authors)}</span>
              </div>
            )}
          </div>

          {movie.imdb_id && (
            <div className="mt-6 flex flex-row gap-2">
              <a
                href={`https://www.imdb.com/title/${movie.imdb_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-row gap-2 hover:opacity-80 transition-opacity cursor-pointer"
              >
                <Image
                  src="/images/logos/imdb.svg"
                  alt="IMDb"
                  width={28}
                  height={28}
                  className="h-7 w-auto"
                />
              </a>
            </div>
          )}
        </div>

        {/* Right column - Where to Watch */}
        <div className="lg:col-span-1">
          <PlatformsDisplay platforms={platformsByAction} />
        </div>
      </div>
    </div>
  );
}

