import { Link } from "@tanstack/react-router";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/common/ui/NavigationMenu";
import { Button } from "@/components/common/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { Settings, Search, User, LogOut, LogIn, UserPlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/common/ui/Dropdown";
import { useSettings } from "@/hooks/useSettings";
import { useNavbarSearch } from "./hooks/useNavbarSearch";
import { MobileSearch } from "./MobileSearch";

interface NavbarProps {
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
}

export function Navbar({ searchQuery, onSearchChange }: NavbarProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const { settings, toggleAnimations } = useSettings();
  const {
    searchQuery: internalSearchQuery,
    searchInputRef,
    handleSearchChange,
  } = useNavbarSearch();
  const resolvedSearchQuery = searchQuery ?? internalSearchQuery;
  const resolvedHandleSearchChange = onSearchChange ?? handleSearchChange;

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="relative w-full">
        <div className="pointer-events-none absolute inset-0 bg-navbar-gradient" style={{ zIndex: 1 }} />
        <div className="relative z-10 mx-auto w-full max-w-screen-2xl px-3 py-4 sm:px-6 md:py-8">
          <div className="flex justify-between items-center w-full gap-4">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <Button asChild variant="link" className="cursor-pointer text-2xl font-bold font-mono">
                  <Link to="/">
                    Denn
                  </Link>
                </Button>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          {/* Search Input - Only visible on desktop (md and above) when logged in */}
          {isAuthenticated && (
            <div className="flex-1 max-w-md mx-auto hidden lg:block font-sans">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300 pointer-events-none z-10" />
                <label htmlFor="navbar-search" className="sr-only">
                  Search movies, TV shows, games, albums, and books
                </label>
                <input
                  id="navbar-search"
                  ref={searchInputRef}
                  type="text"
                  value={resolvedSearchQuery}
                  onChange={(e) => resolvedHandleSearchChange(e.target.value)}
                  placeholder="Search for movies, TV shows, games..."
                  className="w-full pl-12 pr-4 py-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/40 transition-all"
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            {isAuthenticated && (
              <MobileSearch
                value={resolvedSearchQuery}
                onChange={resolvedHandleSearchChange}
              />
            )}

            {isAuthenticated && user ? (
              <>
                {/* Profile Link - Icon only in all views */}
                <Button asChild variant="ghost" size="icon" className="cursor-pointer">
                  <Link to="/profile" aria-label="Profile">
                    <User className="h-5 w-5" />
                  </Link>
                </Button>
              </>
            ) : (
              <>
                {/* Login Link - Text on desktop, icon on mobile */}
                <Button asChild variant="link" className="hidden lg:inline-flex cursor-pointer">
                  <Link to="/login">
                    Login
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="icon" className="lg:hidden cursor-pointer">
                  <Link to="/login" aria-label="Login">
                    <LogIn className="h-5 w-5" />
                  </Link>
                </Button>
                {/* Register Button - Text on desktop, icon on mobile */}
                <Button asChild className="hidden lg:inline-flex cursor-pointer">
                  <Link to="/register">Register</Link>
                </Button>
                <Button asChild variant="ghost" size="icon" className="lg:hidden cursor-pointer">
                  <Link to="/register" aria-label="Register">
                    <UserPlus className="h-5 w-5" />
                  </Link>
                </Button>
              </>
            )}

            {/* Settings Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="cursor-pointer"
                  aria-label="Settings"
                >
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
                      aria-label="Enable animations"
                      tabIndex={-1}
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
    </header>
  );
}
