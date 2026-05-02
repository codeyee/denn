
import { Navbar } from "@/components/layout/Navbar";
import { HomePage } from "@/components/pages/HomePage";
import { LandingPage } from "@/components/pages/LandingPage";
import type { HomepageResponse, PaginatedUserListList } from "@/lib/types";
import type { SessionSnapshot } from "@/server/session";

interface HomeRouteShellProps {
  session: SessionSnapshot;
  country?: string | null;
  initialSuggestions?: HomepageResponse;
  initialLists?: PaginatedUserListList;
}

// AuthSessionBootstrap is mounted globally in app/layout.tsx; this shell only
// needs the SSR session snapshot for initial-render branching.
export function HomeRouteShell({
  session,
  country,
  initialSuggestions,
  initialLists,
}: HomeRouteShellProps) {
  return (
    <div className="relative w-full overflow-x-hidden">
      <Navbar />
      {session.isAuthenticated ? (
        <HomePage
          country={country}
          initialSuggestions={initialSuggestions}
          initialLists={initialLists}
        />
      ) : (
        <LandingPage />
      )}
    </div>
  );
}
