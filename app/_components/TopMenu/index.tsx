"use client";
import Link from "next/link";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/app/_components/ui/navigation-menu";
import { Button } from "../ui/button";

export default function TopMenu() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b shadow-sm">
      <div className="w-full max-w-screen-2xl mx-auto px-4 py-3">
        <div className="flex justify-between items-center w-full">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <Link href="/">
                  <Button variant="link" className="text-white cursor-pointer">
                    Home
                  </Button>
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="link" className="text-white cursor-pointer">
                Login
              </Button>
            </Link>
            <Link href="/register">
              <Button className="cursor-pointer">Register</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
