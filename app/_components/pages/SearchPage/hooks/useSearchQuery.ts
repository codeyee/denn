import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const SEARCH_DEBOUNCE_MS = 500;
const PREV_PAGE_KEY = "denn_search_prev_page";

interface UseSearchQueryReturn {
  searchQuery: string;
  debouncedQuery: string;
  setSearchQuery: (query: string) => void;
  hasUserTyped: boolean;
  mobileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function useSearchQuery(): UseSearchQueryReturn {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [hasUserTyped, setHasUserTyped] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const queryFromUrl = searchParams.get("q") || "";
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
          setHasUserTyped(true);
        } else {
          if (hasUserTyped) {
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
  }, [searchQuery, router, searchParams, hasUserTyped]);

  // Debounce query for search execution
  useEffect(() => {
    const queryFromUrl = searchParams.get("q") || "";
    const timer = setTimeout(() => {
      setDebouncedQuery(queryFromUrl);
    }, SEARCH_DEBOUNCE_MS);

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
    hasUserTyped,
    mobileInputRef,
  };
};
