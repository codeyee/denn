import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";

const SEARCH_DEBOUNCE_MS = 300;
const PREV_PAGE_KEY = "denn_search_prev_page";

function readQueryParam(search: string): string {
  return new URLSearchParams(search).get("q") ?? "";
}

export function useNavbarSearch() {
  const navigate = useNavigate();
  const { pathname, searchStr } = useLocation({
    select: (loc) => ({ pathname: loc.pathname, searchStr: loc.searchStr }),
  });
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMountRef = useRef(true);
  const hasFocusedRef = useRef(false);
  const hasUserTypedRef = useRef(false);

  useEffect(() => {
    if (pathname !== "/search") {
      if (typeof window !== "undefined") {
        sessionStorage.setItem(PREV_PAGE_KEY, pathname);
      }
    }
  }, [pathname]);

  useEffect(() => {
    if (pathname === "/search") {
      const urlQuery = readQueryParam(searchStr);
      setSearchQuery((prevQuery) => {
        if (isInitialMountRef.current || urlQuery !== prevQuery) {
          isInitialMountRef.current = false;
          return urlQuery;
        }
        return prevQuery;
      });
    } else {
      setSearchQuery("");
      isInitialMountRef.current = true;
      hasFocusedRef.current = false;
      hasUserTypedRef.current = false;
    }
  }, [pathname, searchStr]);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const trimmedQuery = searchQuery.trim();

      if (pathname !== "/search") {
        if (trimmedQuery) {
          void navigate({ to: "/search", search: { q: trimmedQuery } });
        }
      } else {
        const urlQuery = readQueryParam(searchStr);
        if (trimmedQuery !== urlQuery) {
          void navigate({
            to: "/search",
            search: trimmedQuery ? { q: trimmedQuery } : {},
            replace: true,
            resetScroll: false,
          });
          hasUserTypedRef.current = Boolean(trimmedQuery);
        }
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, pathname, navigate, searchStr]);

  useEffect(() => {
    if (
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
  }, [pathname]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    hasUserTypedRef.current = true;
  };

  return {
    searchQuery,
    searchInputRef,
    handleSearchChange,
  };
}
