
import { Footer } from "../../layout/Footer";
import { SearchInput } from "./components/SearchInput";
import { SearchResultsSection } from "./components/SearchResultsSection";
import { EmptyState } from "../../common/state/EmptyState";
import { LoadingCarousel } from "../../common/state/LoadingCarousel";
import { ContentType } from "@/lib/types";
import type { SearchResults } from "./types";

interface SearchPageProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  debouncedQuery: string;
  results: SearchResults;
  isLoading: boolean;
  error: string | null;
  hasResults: boolean;
  mobileInputRef: React.RefObject<HTMLInputElement | null>;
  allowAdult: boolean;
  isAuthenticated: boolean;
}

export function SearchPage({
  searchQuery,
  onSearchQueryChange,
  debouncedQuery,
  results,
  isLoading,
  error,
  hasResults,
  mobileInputRef,
  allowAdult,
  isAuthenticated,
}: SearchPageProps) {

  const showLoading = isLoading || (searchQuery.trim() && !hasResults && !error);
  const showResults = !isLoading && !error && debouncedQuery.trim();
  const showInitialState = !searchQuery.trim() && !isLoading && !error;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="relative w-full min-h-screen bg-background-logged-in"
    >
      <h1 className="sr-only">Search Denn</h1>
      {/* Mobile Search Input */}
      <SearchInput
        value={searchQuery}
        onChange={onSearchQueryChange}
        inputRef={mobileInputRef}
      />

      <div className="pt-5 lg:pt-30 pb-20">
        {searchQuery.trim() && (
          <p
            className="container mx-auto px-4 pb-2 text-sm text-gray-300"
            role="status"
          >
            {allowAdult
              ? "Adult content is included in direct search when a provider supplies a reliable classification. Automatic recommendations remain filtered."
              : isAuthenticated
                ? "Adult content is filtered from direct search. You can opt in from your profile."
                : "Adult content is filtered from public search. Sign in to manage your search preference."}
          </p>
        )}
        {/* Error State */}
        {error && !isLoading && (
          <div className="container mx-auto px-4 mt-8 py-8">
            <div className="text-center">
              <p className="text-red-400 text-xl mb-4">Error searching</p>
              <p className="text-gray-400">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State with Placeholders */}
        {showLoading && (
          <>
            <LoadingCarousel contentType={ContentType.MOVIE} />
            <LoadingCarousel contentType={ContentType.TV_SHOW} />
            <LoadingCarousel contentType={ContentType.GAME} />
            <LoadingCarousel contentType={ContentType.ALBUM} />
            <LoadingCarousel contentType={ContentType.BOOK} />
          </>
        )}

        {/* Results Section */}
        {showResults && (
          <>
            <SearchResultsSection
              contentType={ContentType.MOVIE}
              items={results.movies}
            />
            <SearchResultsSection
              contentType={ContentType.TV_SHOW}
              items={results.tvShows}
            />
            <SearchResultsSection
              contentType={ContentType.GAME}
              items={results.games}
            />
            <SearchResultsSection
              contentType={ContentType.ALBUM}
              items={results.music}
            />
            <SearchResultsSection
              contentType={ContentType.BOOK}
              items={results.books}
            />

            {/* No Results State */}
            {!hasResults && <EmptyState type="no-results" query={debouncedQuery} />}
          </>
        )}

        {/* Initial State */}
        {showInitialState && <EmptyState type="initial" />}

        <Footer />
      </div>

      {/* Bottom gradient */}
      <div className="pointer-events-none fixed left-0 right-0 bottom-0 h-16 bg-bottom-gradient z-10" />
    </main>
  );
}
