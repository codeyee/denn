
import { Navbar } from "@/components/layout/Navbar";
import { HomePage } from "@/components/pages/HomePage";
import { LandingPage } from "@/components/pages/LandingPage";
import type { SessionSnapshot } from "@/server/session";

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
