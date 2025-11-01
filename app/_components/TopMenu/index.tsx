"use client";
import Link from "next/link";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/app/_components/ui/navigation-menu";
import { Button } from "../ui/button";
import { useAuth } from "@/app/_hooks/useAuth";

export default function TopMenu() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="relative w-full">
        <div className="pointer-events-none absolute inset-0 bg-navbar-gradient" />
        <div className="relative z-10 w-full max-w-screen-2xl mx-auto px-6 py-8">
          <div className="flex justify-between items-center w-full">
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

          <div className="flex items-center gap-2">
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
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
