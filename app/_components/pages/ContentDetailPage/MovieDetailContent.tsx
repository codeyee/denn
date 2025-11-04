"use client";

import { MovieDetail } from "@/lib/api/types";

interface MovieDetailContentProps {
  movie: MovieDetail;
}

export default function MovieDetailContent({ movie }: MovieDetailContentProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white/5 rounded-2xl p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">About</h2>
            {movie.tagline && (
              <p className="text-white/80 italic mb-4">"{movie.tagline}"</p>
            )}
            {movie.description && (
              <p className="text-gray-300 mb-4 leading-relaxed">{movie.description}</p>
            )}
            
            <div className="mt-6 space-y-2">
              {movie.release_date && (
                <div>
                  <span className="text-white/60 text-sm">Release Date:</span>
                  <span className="text-white ml-2">{movie.release_date}</span>
                </div>
              )}
              {movie.duration_minutes && (
                <div>
                  <span className="text-white/60 text-sm">Duration:</span>
                  <span className="text-white ml-2">{movie.duration_minutes} minutes</span>
                </div>
              )}
              {movie.status && (
                <div>
                  <span className="text-white/60 text-sm">Status:</span>
                  <span className="text-white ml-2">{movie.status}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div>
            {movie.imdb_id && (
              <div className="mb-4">
                <a
                  href={`https://www.imdb.com/title/${movie.imdb_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/80 hover:text-white underline"
                >
                  View on IMDb →
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

