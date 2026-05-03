import { Link } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
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

interface NavbarProps {
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
}

export function Navbar({ searchQuery, onSearchChange }: NavbarProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const { settings, toggleAnimations } = useSettings();
  const navigate = useNavigate();
  const {
    searchQuery: internalSearchQuery,
    searchInputRef,
    handleSearchChange,
  } = useNavbarSearch();
  const resolvedSearchQuery = searchQuery ?? internalSearchQuery;
  const resolvedHandleSearchChange = onSearchChange ?? handleSearchChange;

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="relative w-full">
        <div className="pointer-events-none absolute inset-0 bg-navbar-gradient" style={{ zIndex: 1 }} />
        <div className="relative z-10 w-full max-w-screen-2xl mx-auto px-6 py-8">
          <div className="flex justify-between items-center w-full gap-4">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <Link to="/">
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
                  value={resolvedSearchQuery}
                  onChange={(e) => resolvedHandleSearchChange(e.target.value)}
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
                  void navigate({ to: "/search" });
                }}
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
              </Button>
            )}

            {isAuthenticated && user ? (
              <>
                {/* Profile Link - Icon only in all views */}
                <Link to="/profile">
                  <Button variant="ghost" size="icon" className="cursor-pointer" aria-label="Profile">
                    <User className="h-5 w-5" />
                  </Button>
                </Link>
              </>
            ) : (
              <>
                {/* Login Link - Text on desktop, icon on mobile */}
                <Link to="/login" className="hidden lg:block">
                  <Button variant="link" className="cursor-pointer">
                    Login
                  </Button>
                </Link>
                <Link to="/login" className="lg:hidden">
                  <Button variant="ghost" size="icon" className="cursor-pointer" aria-label="Login">
                    <LogIn className="h-5 w-5" />
                  </Button>
                </Link>
                {/* Register Button - Text on desktop, icon on mobile */}
                <Link to="/register" className="hidden lg:block">
                  <Button className="cursor-pointer">Register</Button>
                </Link>
                <Link to="/register" className="lg:hidden">
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
