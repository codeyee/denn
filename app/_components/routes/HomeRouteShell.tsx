"use client";

import { Navbar } from "@/app/_components/layout/Navbar";
import { HomePage } from "@/app/_components/pages/HomePage";
import { LandingPage } from "@/app/_components/pages/LandingPage";
import type { SessionSnapshot } from "@/lib/auth/session-server";
import type { HomePageData } from "@/lib/server/home";
import { AuthSessionBootstrap } from "./AuthSessionBootstrap";

interface HomeRouteShellProps {
  session: SessionSnapshot;
  initialData: HomePageData;
}

export function HomeRouteShell({ session, initialData }: HomeRouteShellProps) {
  return (
    <div className="relative w-full overflow-x-hidden">
      <AuthSessionBootstrap session={session} />
      <Navbar />
      {session.isAuthenticated ? (
        <HomePage
          initialSuggestions={initialData.suggestions}
          initialSuggestionsError={initialData.suggestionsError}
          initialLists={initialData.lists}
          initialListsError={initialData.listsError}
        />
      ) : (
        <LandingPage />
      )}
    </div>
  );
}
