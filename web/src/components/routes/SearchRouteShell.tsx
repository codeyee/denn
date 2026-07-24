
import { useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { SearchPage } from "@/components/pages/SearchPage";
import { useSearchResults } from "@/components/pages/SearchPage/hooks/useSearchResults";
import type { SessionSnapshot } from "@/server/session";
import type { MultiSearchResponse } from "@/lib/types";

// AuthSessionBootstrap is mounted globally in app/layout.tsx; this shell only
// needs the SSR session snapshot for initial-render branching.

const SEARCH_DEBOUNCE_MS = 400;

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
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const hasFocusedRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

  useEffect(() => {
    setSearchQuery(initialQuery);
    setDebouncedQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    const currentQuery = url.searchParams.get("q") ?? "";
    const nextQuery = debouncedQuery.trim();

    if (currentQuery === nextQuery) {
      return;
    }

    if (nextQuery) {
      url.searchParams.set("q", nextQuery);
    } else {
      url.searchParams.delete("q");
    }

    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, [debouncedQuery]);

  useEffect(() => {
    if (hasFocusedRef.current || !mobileInputRef.current) {
      return;
    }

    requestAnimationFrame(() => {
      mobileInputRef.current?.focus();
      hasFocusedRef.current = true;
    });
  }, []);

  const { results, isLoading, error, hasResults } = useSearchResults(
    debouncedQuery,
    {
      country,
      enabled: session.isAuthenticated,
      initialData:
        debouncedQuery === initialQuery ? initialResults : undefined,
    },
  );

  return (
    <div className="relative w-full overflow-x-hidden">
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      {session.isAuthenticated ? (
        <SearchPage
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          debouncedQuery={debouncedQuery}
          results={results}
          isLoading={isLoading}
          error={error}
          hasResults={hasResults}
          mobileInputRef={mobileInputRef}
        />
      ) : (
        <div className="flex items-center justify-center min-h-screen bg-background-logged-in">
          <p className="text-white text-xl">Please log in to search</p>
        </div>
      )}
    </div>
  );
}
