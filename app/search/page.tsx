import { SearchRouteShell } from "@/app/_components/routes/SearchRouteShell";
import { EMPTY_SEARCH_RESULTS } from "@/app/_components/pages/SearchPage/types";
import { getServerCountryCode, resolveSession } from "@/lib/auth/session-server";
import { getSearchResults } from "@/lib/server/search";

interface SearchPageProps {
  searchParams?: Promise<{
    q?: string;
  }>;
}

export default async function Search({ searchParams }: SearchPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const initialQuery = params?.q?.trim() ?? "";
  const session = await resolveSession();
  const country = await getServerCountryCode();
  let initialResults = EMPTY_SEARCH_RESULTS;
  let initialError: string | null = null;

  if (session.isAuthenticated && initialQuery) {
    try {
      initialResults = await getSearchResults(initialQuery, country);
    } catch (error) {
      initialError =
        error instanceof Error ? error.message : "Failed to load search results";
    }
  }

  return (
    <SearchRouteShell
      session={session}
      initialQuery={initialQuery}
      initialResults={initialResults}
      initialError={initialError}
    />
  );
}
