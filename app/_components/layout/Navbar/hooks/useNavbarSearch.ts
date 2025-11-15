import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

const SEARCH_DEBOUNCE_MS = 300;
const PREV_PAGE_KEY = "denn_search_prev_page";

export function useNavbarSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
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
      const urlQuery = searchParams.get("q") || "";
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
  }, [pathname, searchParams]);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const trimmedQuery = searchQuery.trim();

      if (pathname !== "/search") {
        if (trimmedQuery) {
          router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
        }
      } else {
        const urlQuery = searchParams.get("q") || "";
        if (trimmedQuery !== urlQuery) {
          if (trimmedQuery) {
            router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`, {
              scroll: false,
            });
            hasUserTypedRef.current = true;
          } else {
            if (hasUserTypedRef.current) {
              const prevPage =
                typeof window !== "undefined"
                  ? sessionStorage.getItem(PREV_PAGE_KEY) || "/"
                  : "/";
              router.push(prevPage);
            }
          }
        }
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, pathname, router, searchParams]);

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
