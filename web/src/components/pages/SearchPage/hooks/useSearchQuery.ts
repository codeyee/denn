import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";

const SEARCH_DEBOUNCE_MS = 500;
const PREV_PAGE_KEY = "denn_search_prev_page";

interface UseSearchQueryReturn {
  searchQuery: string;
  debouncedQuery: string;
  setSearchQuery: (query: string) => void;
  hasUserTyped: boolean;
  mobileInputRef: React.RefObject<HTMLInputElement | null>;
}

function readQueryParam(search: string): string {
  return new URLSearchParams(search).get("q") ?? "";
}

export function useSearchQuery(): UseSearchQueryReturn {
  const navigate = useNavigate();
  const searchStr = useLocation({ select: (loc) => loc.searchStr });

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [hasUserTyped, setHasUserTyped] = useState(false);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const queryFromUrl = readQueryParam(searchStr);
    setSearchQuery(queryFromUrl);
  }, [searchStr]);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const trimmedQuery = searchQuery.trim();
      const urlQuery = readQueryParam(searchStr);

      if (trimmedQuery !== urlQuery) {
        if (trimmedQuery) {
          void navigate({
            to: "/search",
            search: { q: trimmedQuery },
            resetScroll: false,
          });
          setHasUserTyped(true);
        } else if (hasUserTyped) {
          const prevPage =
            typeof window !== "undefined"
              ? sessionStorage.getItem(PREV_PAGE_KEY) || "/"
              : "/";
          void navigate({ to: prevPage });
        }
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, navigate, searchStr, hasUserTyped]);

  useEffect(() => {
    const queryFromUrl = readQueryParam(searchStr);
    const timer = setTimeout(() => {
      setDebouncedQuery(queryFromUrl);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchStr]);

  useEffect(() => {
    if (mobileInputRef.current) {
      requestAnimationFrame(() => {
        mobileInputRef.current?.focus();
      });
    }
  }, []);

  return {
    searchQuery,
    debouncedQuery,
    setSearchQuery,
    hasUserTyped,
    mobileInputRef,
  };
}
