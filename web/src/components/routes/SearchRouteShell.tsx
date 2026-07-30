
import { useCallback, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";

import { Navbar } from "@/components/layout/Navbar";
import { SearchPage } from "@/components/pages/SearchPage";
import { useSearchResults } from "@/components/pages/SearchPage/hooks/useSearchResults";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import type { SessionSnapshot } from "@/server/session";
import type { MultiSearchResponse } from "@/lib/types";

// AuthSessionBootstrap is mounted globally in app/layout.tsx; this shell only
// needs the SSR session snapshot for initial-render branching.

interface SearchRouteShellProps {
  session: SessionSnapshot;
  initialQuery: string;
  country?: string | null;
  initialResults?: MultiSearchResponse;
}

export function SearchRouteShell({
  session,
  initialQuery,
  country,
  initialResults,
}: SearchRouteShellProps) {
  const navigate = useNavigate();
  const searchStr = useLocation({ select: (loc) => loc.searchStr });
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const hasFocusedRef = useRef(false);
  const allowAdult = session.user?.allow_adult_content ?? false;

  const currentQuery = new URLSearchParams(searchStr).get("q") ?? "";
  const updateRouteQuery = useCallback(
    (query: string) => {
      if (query === currentQuery) return;

      void navigate({
        to: "/search",
        search: query ? { q: query } : {},
        replace: true,
        resetScroll: false,
      });
    },
    [currentQuery, navigate],
  );

  const {
    value: searchQuery,
    debouncedValue: debouncedQuery,
    isDebouncing,
    onChange: setSearchQuery,
    clear: clearSearch,
  } = useDebouncedSearch({
    initialValue: initialQuery,
    onDebouncedChange: updateRouteQuery,
  });

  useEffect(() => {
    if (hasFocusedRef.current || !mobileInputRef.current) {
      return;
    }

    requestAnimationFrame(() => {
      mobileInputRef.current?.focus();
      hasFocusedRef.current = true;
    });
  }, []);

  const { results, isLoading, isFetching, error, hasResults } = useSearchResults(
    debouncedQuery,
    {
      country,
      enabled: true,
      initialData:
        debouncedQuery === initialQuery ? initialResults : undefined,
      allowAdult,
    },
  );

  return (
    <div className="relative w-full overflow-x-hidden">
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <SearchPage
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        debouncedQuery={debouncedQuery}
        results={results}
        isLoading={isLoading}
        isFetching={isFetching}
        error={error}
        hasResults={hasResults}
        isDebouncing={isDebouncing}
        mobileInputRef={mobileInputRef}
        onClearSearch={clearSearch}
        allowAdult={allowAdult}
        isAuthenticated={session.isAuthenticated}
      />
    </div>
  );
}
