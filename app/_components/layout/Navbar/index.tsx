"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/app/_components/common/NavigationMenu";
import { Button } from "@/app/_components/common/Button";
import { useAuth } from "@/app/_hooks/useAuth";
import { Settings, Search, User, LogOut, LogIn, UserPlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/app/_components/common/ui/Dropdown";
import { useSettings } from "@/app/_hooks/useSettings";

const SEARCH_DEBOUNCE_MS = 300;
const PREV_PAGE_KEY = "denn_search_prev_page";

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { settings, toggleAnimations } = useSettings();
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
      // Store current page as previous page (but not if it's search itself)
      if (typeof window !== "undefined") {
        sessionStorage.setItem(PREV_PAGE_KEY, pathname);
      }
    }
  }, [pathname]);

  // Sync search query from URL when on search page
  useEffect(() => {
    if (pathname === "/search") {
      const urlQuery = searchParams.get("q") || "";
      // Use functional update to avoid stale closure
      setSearchQuery((prevQuery) => {
        // Only update if URL query actually changed (to avoid unnecessary re-renders)
        if (isInitialMountRef.current || urlQuery !== prevQuery) {
          isInitialMountRef.current = false;
          return urlQuery;
        }
        return prevQuery;
      });
    } else {
      // Clear search when leaving search page
      setSearchQuery("");
      isInitialMountRef.current = true;
      hasFocusedRef.current = false;
      hasUserTypedRef.current = false;
    }
  }, [pathname, searchParams]);

  // Handle navigation and URL updates with debouncing
  useEffect(() => {
    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const trimmedQuery = searchQuery.trim();

      if (pathname !== "/search") {
        // Not on search page - navigate to search if query exists
        if (trimmedQuery) {
          router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
        }
      } else {
        // On search page - update URL if query changed
        const urlQuery = searchParams.get("q") || "";
        if (trimmedQuery !== urlQuery) {
          if (trimmedQuery) {
            router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`, { scroll: false });
            hasUserTypedRef.current = true; // Mark that user has typed
          } else {
            // Query is empty - only go back if user had typed before (not on initial empty visit)
            if (hasUserTypedRef.current) {
              const prevPage = typeof window !== "undefined" 
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

  // Maintain focus on search input when on search page (only once per visit)
  useEffect(() => {
    if (pathname === "/search" && searchInputRef.current && !hasFocusedRef.current) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        if (searchInputRef.current) {
          // Only focus if nothing else is focused (user hasn't clicked elsewhere)
          if (document.activeElement === document.body || document.activeElement === null) {
            searchInputRef.current.focus();
            // Move cursor to end of input
            const length = searchInputRef.current.value.length;
            searchInputRef.current.setSelectionRange(length, length);
            hasFocusedRef.current = true;
          }
        }
      });
    }
  }, [pathname]);

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="relative w-full">
        <div className="pointer-events-none absolute inset-0 bg-navbar-gradient" style={{ zIndex: 1 }} />
        <div className="relative z-10 w-full max-w-screen-2xl mx-auto px-6 py-8">
          <div className="flex justify-between items-center w-full gap-4">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <Link href="/">
                  <Button variant="link" className="cursor-pointer text-2xl font-bold font-mono">
                    Denn
                  </Button>
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          {/* Search Input - Only visible on desktop (md and above) when logged in */}
          {isAuthenticated && (
            <div className="flex-1 max-w-md mx-auto hidden lg:block font-sans">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300 pointer-events-none z-10" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    hasUserTypedRef.current = true;
                  }}
                  placeholder="Search for movies, TV shows, games..."
                  className="w-full pl-12 pr-4 py-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/40 transition-all"
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            {/* Search Icon Button - Only visible on mobile/tablet (below lg) when logged in */}
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="icon"
                className="cursor-pointer lg:hidden"
                onClick={() => {
                  router.push("/search");
                }}
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
              </Button>
            )}

            {isAuthenticated && user ? (
              <>
                {/* Profile Link - Icon only in all views */}
                <Link href="/profile">
                  <Button variant="ghost" size="icon" className="cursor-pointer" aria-label="Profile">
                    <User className="h-5 w-5" />
                  </Button>
                </Link>
              </>
            ) : (
              <>
                {/* Login Link - Text on desktop, icon on mobile */}
                <Link href="/login" className="hidden lg:block">
                  <Button variant="link" className="cursor-pointer">
                    Login
                  </Button>
                </Link>
                <Link href="/login" className="lg:hidden">
                  <Button variant="ghost" size="icon" className="cursor-pointer" aria-label="Login">
                    <LogIn className="h-5 w-5" />
                  </Button>
                </Link>
                {/* Register Button - Text on desktop, icon on mobile */}
                <Link href="/register" className="hidden lg:block">
                  <Button className="cursor-pointer">Register</Button>
                </Link>
                <Link href="/register" className="lg:hidden">
                  <Button variant="ghost" size="icon" className="cursor-pointer" aria-label="Register">
                    <UserPlus className="h-5 w-5" />
                  </Button>
                </Link>
              </>
            )}

            {/* Settings Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="cursor-pointer">
                  <Settings className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={toggleAnimations}>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.animationsEnabled}
                      onChange={() => {}}
                      className="cursor-pointer"
                    />
                    <span>Enable Animations</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Logout Button - Icon only in all views, placed last */}
            {isAuthenticated && user && (
              <Button
                variant="ghost"
                size="icon"
                className="cursor-pointer"
                onClick={logout}
                aria-label="Logout"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
