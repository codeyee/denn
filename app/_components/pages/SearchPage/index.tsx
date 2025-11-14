"use client";

import { useRef } from "react";
import Footer from "../../layout/Footer";
import { useSearchQuery } from "./hooks/useSearchQuery";
import { useSearchResults } from "./hooks/useSearchResults";
import {
  SearchInput,
  SearchResultsSection,
  LoadingSection,
  EmptyState,
} from "./components";

const ITEMS_PER_CAROUSEL = undefined;
const ITEM_TARGET_WIDTH = 250;

/**
 * SearchPage - Main orchestrator component
 * Responsibilities:
 * - Coordinate hooks for search query and results
 * - Render appropriate UI based on state (loading, error, results, empty)
 * - Manage layout and page structure
 */
export default function SearchPage() {
  // Search query management (URL sync, debouncing)
  const {
    searchQuery,
    debouncedQuery,
    setSearchQuery,
    mobileInputRef,
  } = useSearchQuery();

  // Track if user has typed for loading state logic
  const hasUserTypedRef = useRef(false);
  const handleUserTyped = () => {
    hasUserTypedRef.current = true;
  };

  // Search results management (API calls, data transformation)
  const { results, isLoading, error, hasResults } =
    useSearchResults(debouncedQuery);

  // Determine which state to show
  const showLoading =
    isLoading || (searchQuery.trim() && !hasResults && !error);
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
            <LoadingSection
              title="Movies"
              itemsPerView={ITEMS_PER_CAROUSEL}
              targetCardWidth={ITEM_TARGET_WIDTH}
            />
            <LoadingSection
              title="TV Shows"
              itemsPerView={ITEMS_PER_CAROUSEL}
              targetCardWidth={ITEM_TARGET_WIDTH}
            />
            <LoadingSection
              title="Games"
              itemsPerView={ITEMS_PER_CAROUSEL}
              targetCardWidth={ITEM_TARGET_WIDTH}
            />
            <LoadingSection
              title="Music"
              itemsPerView={ITEMS_PER_CAROUSEL}
              targetCardWidth={ITEM_TARGET_WIDTH}
            />
            <LoadingSection
              title="Books"
              itemsPerView={ITEMS_PER_CAROUSEL}
              targetCardWidth={ITEM_TARGET_WIDTH}
            />
          </>
        )}

        {/* Results Section */}
        {showResults && (
          <>
            <SearchResultsSection
              title="Movies"
              items={results.movies}
              itemsPerView={ITEMS_PER_CAROUSEL}
              targetCardWidth={ITEM_TARGET_WIDTH}
            />
            <SearchResultsSection
              title="TV Shows"
              items={results.tvShows}
              itemsPerView={ITEMS_PER_CAROUSEL}
              targetCardWidth={ITEM_TARGET_WIDTH}
            />
            <SearchResultsSection
              title="Games"
              items={results.games}
              itemsPerView={ITEMS_PER_CAROUSEL}
              targetCardWidth={ITEM_TARGET_WIDTH}
            />
            <SearchResultsSection
              title="Music"
              items={results.music}
              itemsPerView={ITEMS_PER_CAROUSEL}
              targetCardWidth={ITEM_TARGET_WIDTH}
            />
            <SearchResultsSection
              title="Books"
              items={results.books}
              itemsPerView={ITEMS_PER_CAROUSEL}
              targetCardWidth={ITEM_TARGET_WIDTH}
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
    </div>
  );
}
