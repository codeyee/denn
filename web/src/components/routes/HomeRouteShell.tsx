
import { Navbar } from "@/components/layout/Navbar";
import { HomePage } from "@/components/pages/HomePage";
import type { HomepageResponse, PaginatedUserListList } from "@/lib/types";
import type { SessionSnapshot } from "@/server/session";

interface HomeRouteShellProps {
  session: SessionSnapshot;
  country?: string | null;
  initialSuggestions?: HomepageResponse;
  initialLists?: PaginatedUserListList;
}

export function HomeRouteShell({
  session,
  country,
  initialSuggestions,
  initialLists,
}: HomeRouteShellProps) {
  return (
    <div className="relative w-full overflow-x-hidden">
      <Navbar />
      <HomePage
        country={country}
        isAuthenticated={session.isAuthenticated}
        initialSuggestions={initialSuggestions}
        initialLists={initialLists}
      />
    </div>
  );
}
