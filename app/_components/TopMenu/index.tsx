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
    <div className="fixed top-0 left-0 right-0 z-50 bg-transparent">
      <div className="w-full max-w-screen-2xl mx-auto px-4 py-3">
        <div className="flex justify-between items-center w-full">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <Link href="/">
                  <Button variant="link" className="cursor-pointer">
                    Home
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
  );
}
