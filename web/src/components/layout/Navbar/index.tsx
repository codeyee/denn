import { Link, useLocation } from "@tanstack/react-router";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/common/ui/NavigationMenu";
import { Button } from "@/components/common/ui/Button";
import { SearchInput } from "@/components/common/ui/SearchInput";
import { UserAvatar } from "@/components/common/ui/UserAvatar";
import { useAuth } from "@/hooks/useAuth";
import { Settings, LogOut, LogIn, User, UserPlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/common/ui/Dropdown";
import { useNavbarSearch } from "./hooks/useNavbarSearch";
import { MobileSearch } from "./MobileSearch";

interface NavbarProps {
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
}

export function Navbar({ searchQuery, onSearchChange }: NavbarProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const pathname = useLocation({ select: (location) => location.pathname });
  const isBrowseFamilyRoute = pathname.startsWith("/browse/");
  const isSearchControlled =
    searchQuery !== undefined && onSearchChange !== undefined;
  const {
    searchQuery: internalSearchQuery,
    searchInputRef,
    handleSearchChange,
  } = useNavbarSearch({ enabled: !isSearchControlled });
  const resolvedSearchQuery = searchQuery ?? internalSearchQuery;
  const resolvedHandleSearchChange = onSearchChange ?? handleSearchChange;

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="relative w-full">
        <div className="pointer-events-none absolute inset-0 bg-navbar-gradient" style={{ zIndex: 1 }} />
        <div className="layout-content relative z-10 py-4 md:py-8">
          <div className="flex justify-between items-center w-full gap-4">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <Button
                  asChild
                  variant="link"
                  className="cursor-pointer items-end gap-3 px-0 text-2xl font-bold font-mono leading-none hover:no-underline"
                >
                  <Link to="/" aria-label="Denn home">
                    <img
                      src="/logo.png"
                      alt=""
                      width={32}
                      height={32}
                      className="h-7 w-7 self-end object-contain md:h-8 md:w-8"
                    />
                    <span className="leading-none">Denn</span>
                  </Link>
                </Button>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          {!isBrowseFamilyRoute && (
            <div className="flex-1 max-w-md mx-auto hidden lg:block font-sans">
              <SearchInput
                id="navbar-search"
                inputRef={searchInputRef}
                value={resolvedSearchQuery}
                onChange={resolvedHandleSearchChange}
                onClear={() => resolvedHandleSearchChange("")}
                label="Search movies, TV shows, games, albums, and books"
                placeholder="Search for movies, TV shows, games..."
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            {!isBrowseFamilyRoute && (
              <MobileSearch
                value={resolvedSearchQuery}
                onChange={resolvedHandleSearchChange}
              />
            )}

            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    aria-label={`Open @${user.username} menu`}
                    aria-haspopup="menu"
                    className="max-w-52 gap-2 px-2 md:px-3"
                  >
                    <UserAvatar
                      avatarUrl={user.avatar_url}
                      username={user.username}
                      className="h-9 w-9 border border-white/25 text-sm"
                    />
                    <span className="max-w-32 truncate text-sm font-semibold text-white/90">
                      @{user.username}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" data-user-menu>
                  <DropdownMenuItem>
                    <Link
                      to="/user/$username"
                      params={{ username: user.username }}
                      search={{ tab: "overview", page: 1 }}
                      className="flex min-h-11 w-full items-center gap-3"
                    >
                      <User aria-hidden="true" className="h-4 w-4" />
                      <span>View profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link
                      to="/settings"
                      className="flex min-h-11 w-full items-center gap-3"
                    >
                      <Settings aria-hidden="true" className="h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={logout}
                    className="min-h-11 gap-3"
                  >
                    <LogOut aria-hidden="true" className="h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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

          </div>
          </div>
        </div>
      </div>
    </header>
  );
}
