
import { MovieDetail } from "@/lib/types";
import { normalizeContentPlatforms } from "@/lib/platforms/contentPlatforms";
import { formatReleaseDate } from "@/lib/utils/dateUtils";
import { formatAuthors } from "@/lib/utils/authorUtils";
import { cn } from "@/lib/utils/tailwindUtils";
import { PlatformsDisplay } from "../platforms/PlatformsDisplay";

interface MovieDetailContentProps {
  movie: MovieDetail;
}

export function MovieDetailContent({ movie }: MovieDetailContentProps) {
  const releaseDate = formatReleaseDate(movie.release_date);

  const normalizedPlatforms = normalizeContentPlatforms(movie.platforms);
  const hasPlatforms = normalizedPlatforms.length > 0;

  return (
    <div className="layout-content mt-8">
      <h2 className="text-2xl font-bold text-white mb-6">About</h2>

      {/* About layout */}
      <div className={cn("grid grid-cols-1 gap-8", hasPlatforms && "lg:grid-cols-3")}>
        {/* Left column - Description */}
        <div className={cn(hasPlatforms && "lg:col-span-2")}>
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
                <img
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

        {hasPlatforms && (
          <div className="lg:col-span-1">
            <PlatformsDisplay platforms={normalizedPlatforms} />
          </div>
        )}
      </div>
    </div>
  );
}
