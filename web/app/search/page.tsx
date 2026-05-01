import { SearchRouteShell } from "@/app/_components/routes/SearchRouteShell";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import {
  getCachedServerCountryCode,
  getCachedSession,
} from "@/lib/auth/session-server";
import {
  getServerQueryClient,
  prefetchSearchQuery,
} from "@/lib/api/queries/server";

interface SearchPageProps {
  searchParams?: Promise<{
    q?: string;
  }>;
}

export default async function Search({ searchParams }: SearchPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const initialQuery = params?.q?.trim() ?? "";
  const session = await getCachedSession();
  const country = await getCachedServerCountryCode();
  const qc = getServerQueryClient();

  await prefetchSearchQuery(qc, session, initialQuery, country);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <SearchRouteShell
        session={session}
        initialQuery={initialQuery}
        country={country}
      />
    </HydrationBoundary>
  );
}
