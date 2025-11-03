"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/app/_components/lib/navigation-menu";
import { Button } from "@/app/_components/lib/button";
import { useAuth } from "@/app/_hooks/useAuth";
import { Settings, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/app/_components/common/Dropdown";
import { useSettings } from "@/app/_hooks/useSettings";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { settings, toggleAnimations } = useSettings();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const isInternalNavigationRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (pathname !== "/search") {
      setSearchQuery("");
    } else if (!isInternalNavigationRef.current) {
      const queryFromUrl = searchParams.get("q") || "";
      setSearchQuery(queryFromUrl);
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    if (pathname !== "/search" && searchQuery.trim()) {
      isInternalNavigationRef.current = true;
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      return;
    }

    if (pathname === "/search") {
      const urlQuery = searchParams.get("q") || "";
      if (searchQuery.trim() !== urlQuery.trim()) {
        isInternalNavigationRef.current = true;
        router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`, { scroll: false });
      }
    }

    isInternalNavigationRef.current = false;
  }, [searchQuery, pathname, router, searchParams]);

  useEffect(() => {
    if (pathname === "/search" && searchInputRef.current && document.activeElement !== searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
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

          {/* Search Input - Only visible when logged in */}
          {isAuthenticated && (
            <div className="flex-1 max-w-md mx-auto hidden md:block">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for movies, TV shows, games..."
                  className="w-full pl-12 pr-4 py-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/40 transition-all"
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <>
                <Link href="/profile">
                  <Button variant="link" className="cursor-pointer">
                    Welcome, {user.username}
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="cursor-pointer"
                  onClick={logout}
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="link" className="cursor-pointer">
                    Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button className="cursor-pointer">Register</Button>
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
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
