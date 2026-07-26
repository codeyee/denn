import { ContentItem, SourceApi } from "@/lib/types";

interface ApiAttributionProps {
  contentItem: ContentItem;
}

export function ApiAttribution({ contentItem }: ApiAttributionProps) {
  return (
    <div className="mt-8 w-full px-4 font-sans md:px-8 lg:px-12">
      <div className="text-center text-sm text-gray-300">
        {contentItem.source_api === SourceApi.TMDB && (
          <div className="flex flex-row justify-center gap-2">
            <p>
              Data provided by{" "}
              <a
                href="https://www.themoviedb.org"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white underline"
              >
                TMDB
              </a>
            </p>
            <p>•</p>
            <p>
              <a
                href="https://www.justwatch.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white underline"
              >
                JustWatch
              </a>
            </p>
          </div>
        )}
        {contentItem.source_api === SourceApi.IGDB && (
          <p>
            Data provided by{" "}
            <a
              href="https://www.igdb.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white underline"
            >
              IGDB
            </a>
          </p>
        )}
        {contentItem.source_api === SourceApi.SPOTIFY && (
          <p>
            Data provided by{" "}
            <a
              href="https://www.spotify.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white underline"
            >
              Spotify
            </a>
          </p>
        )}
        {contentItem.source_api === SourceApi.OPENLIBRARY && (
          <p>
            Data provided by{" "}
            <a
              href="https://openlibrary.org"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white underline"
            >
              Open Library
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
