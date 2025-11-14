"use client";

import { useRef } from "react";
import Footer from "../../layout/Footer";
import { useSearchQuery } from "./hooks/useSearchQuery";
import { useSearchResults } from "./hooks/useSearchResults";
import { SearchInput } from "./components/SearchInput";
import { SearchResultsSection } from "./components/SearchResultsSection";
import { EmptyState } from "../../common/state/EmptyState";
import { LoadingCarousel } from "../../common/state/LoadingCarousel";

export default function SearchPage() {
  const {
    searchQuery,
    debouncedQuery,
    setSearchQuery,
    mobileInputRef,
  } = useSearchQuery();

  const hasUserTypedRef = useRef(false);

  const handleUserTyped = () => {
    hasUserTypedRef.current = true;
  };

  const { results, isLoading, error, hasResults } = useSearchResults(debouncedQuery);

  const showLoading = isLoading || (searchQuery.trim() && !hasResults && !error);
  const showResults = !isLoading && !error && debouncedQuery.trim();
  const showInitialState = !searchQuery.trim() && !isLoading && !error;

  return (
    <div className="relative w-full min-h-screen bg-background-logged-in">
      {/* Mobile Search Input */}
      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        inputRef={mobileInputRef}
        onUserTyped={handleUserTyped}
      />

      <div className="pt-5 lg:pt-30 pb-20">
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
            <LoadingCarousel title="Movies" />
            <LoadingCarousel title="TV Shows" />
            <LoadingCarousel title="Games" />
            <LoadingCarousel title="Music" />
            <LoadingCarousel title="Books" />
          </>
        )}

        {/* Results Section */}
        {showResults && (
          <>
            <SearchResultsSection title="Movies" items={results.movies} />
            <SearchResultsSection title="TV Shows" items={results.tvShows} />
            <SearchResultsSection title="Games" items={results.games} />
            <SearchResultsSection title="Music" items={results.music} />
            <SearchResultsSection title="Books" items={results.books} />

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
    </div>
  );
}
