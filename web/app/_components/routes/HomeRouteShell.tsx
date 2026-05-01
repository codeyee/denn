"use client";

import { Navbar } from "@/app/_components/layout/Navbar";
import { HomePage } from "@/app/_components/pages/HomePage";
import { LandingPage } from "@/app/_components/pages/LandingPage";
import type { SessionSnapshot } from "@/lib/auth/session-server";

interface HomeRouteShellProps {
  session: SessionSnapshot;
  country?: string | null;
}

// AuthSessionBootstrap is mounted globally in app/layout.tsx; this shell only
// needs the SSR session snapshot for initial-render branching.
export function HomeRouteShell({ session, country }: HomeRouteShellProps) {
  return (
    <div className="relative w-full overflow-x-hidden">
      <Navbar />
      {session.isAuthenticated ? (
        <HomePage country={country} />
      ) : (
        <LandingPage />
      )}
    </div>
  );
}
