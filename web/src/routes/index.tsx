import { createFileRoute } from "@tanstack/react-router";

import { HomeRouteShell } from "@/components/routes/HomeRouteShell";
import { prefetchHomeQueries } from "@/lib/api/queries/server";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await prefetchHomeQueries(
      context.queryClient,
      context.session,
      context.country,
    );
    return { session: context.session, country: context.country };
  },
  component: HomeRoute,
});

function HomeRoute() {
  const { session, country } = Route.useLoaderData();
  return <HomeRouteShell session={session} country={country} />;
}
