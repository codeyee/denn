import { useCallback, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";

import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";

function readQueryParam(search: string): string {
  return new URLSearchParams(search).get("q") ?? "";
}

interface UseNavbarSearchOptions {
  enabled?: boolean;
}

export function useNavbarSearch({ enabled = true }: UseNavbarSearchOptions = {}) {
  const navigate = useNavigate();
  const { pathname, searchStr } = useLocation({
    select: (loc) => ({ pathname: loc.pathname, searchStr: loc.searchStr }),
  });
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hasFocusedRef = useRef(false);

  const currentQuery = pathname === "/search" ? readQueryParam(searchStr) : "";
  const navigateToSearch = useCallback(
    (query: string) => {
      if (!enabled) return;

      if (pathname !== "/search") {
        if (query) {
          void navigate({ to: "/search", search: { q: query } });
        }
        return;
      }

      if (query === currentQuery) return;
      void navigate({
        to: "/search",
        search: query ? { q: query } : {},
        replace: true,
        resetScroll: false,
      });
    },
    [currentQuery, enabled, navigate, pathname],
  );

  const {
    value: searchQuery,
    onChange: handleSearchChange,
  } = useDebouncedSearch({
    initialValue: currentQuery,
    onDebouncedChange: navigateToSearch,
  });

  useEffect(() => {
    if (enabled && pathname !== "/search") {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("denn_search_prev_page", pathname);
      }
    }
  }, [enabled, pathname]);

  useEffect(() => {
    if (
      enabled &&
      pathname === "/search" &&
      searchInputRef.current &&
      !hasFocusedRef.current
    ) {
      requestAnimationFrame(() => {
        if (searchInputRef.current) {
          if (
            document.activeElement === document.body ||
            document.activeElement === null
          ) {
            searchInputRef.current.focus();
            const length = searchInputRef.current.value.length;
            searchInputRef.current.setSelectionRange(length, length);
            hasFocusedRef.current = true;
          }
        }
      });
    }
  }, [enabled, pathname]);

  return {
    searchQuery,
    searchInputRef,
    handleSearchChange,
  };
}
