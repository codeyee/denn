import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const SEARCH_DEBOUNCE_MS = 300;
const PREV_PAGE_KEY = "denn_search_prev_page";

interface UseSearchQueryReturn {
  searchQuery: string;
  debouncedQuery: string;
  setSearchQuery: (query: string) => void;
  hasUserTyped: boolean;
  mobileInputRef: React.RefObject<HTMLInputElement>;
}

/**
 * Manages search query state with URL synchronization and debouncing
 * Handles:
 * - Reading query from URL params
 * - Debouncing user input
 * - Syncing query to URL
 * - Navigation back when query is cleared
 */
export function useSearchQuery(): UseSearchQueryReturn {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasUserTypedRef = useRef(false);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  // Initialize from URL params
  useEffect(() => {
    const queryFromUrl = searchParams.get("q") || "";
    setSearchQuery(queryFromUrl);
  }, [searchParams]);

  // Sync search query to URL with debouncing
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const trimmedQuery = searchQuery.trim();
      const urlQuery = searchParams.get("q") || "";

      if (trimmedQuery !== urlQuery) {
        if (trimmedQuery) {
          router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`, {
            scroll: false,
          });
          hasUserTypedRef.current = true;
        } else {
          // Navigate back when query is cleared
          if (hasUserTypedRef.current) {
            const prevPage =
              typeof window !== "undefined"
                ? sessionStorage.getItem(PREV_PAGE_KEY) || "/"
                : "/";
            router.push(prevPage);
          }
        }
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, router, searchParams]);

  // Debounce query for search execution
  useEffect(() => {
    const queryFromUrl = searchParams.get("q") || "";
    const timer = setTimeout(() => {
      setDebouncedQuery(queryFromUrl);
    }, 500); // Longer delay for actual search

    return () => clearTimeout(timer);
  }, [searchParams]);

  // Auto-focus mobile input on mount
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
    hasUserTyped: hasUserTypedRef.current,
    mobileInputRef,
  };
}
