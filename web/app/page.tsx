import { HomeRouteShell } from "@/app/_components/routes/HomeRouteShell";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import {
  getCachedServerCountryCode,
  getCachedSession,
} from "@/lib/auth/session-server";
import {
  getServerQueryClient,
  prefetchHomeQueries,
} from "@/lib/api/queries/server";

export default async function Home() {
  const session = await getCachedSession();
  const country = await getCachedServerCountryCode();
  const qc = getServerQueryClient();

  await prefetchHomeQueries(qc, session, country);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <HomeRouteShell session={session} country={country} />
    </HydrationBoundary>
  );
}
