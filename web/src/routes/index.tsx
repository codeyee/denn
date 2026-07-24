import { createFileRoute } from "@tanstack/react-router";

import { HomeRouteShell } from "@/components/routes/HomeRouteShell";
import { queryKeys, SUGGESTIONS_PAGE_SIZE } from "@/lib/api/queries";
import { homeListParams, prefetchHomeQueries } from "@/lib/api/queries/server";
import type { HomepageResponse, PaginatedUserListList } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Explore movies, TV, games, music, and books | Denn" },
      {
        name: "description",
        content:
          "Explore Denn's public multi-media catalog without creating an account.",
      },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  loader: async ({ context }) => {
    await prefetchHomeQueries(
      context.queryClient,
      context.session,
      context.country,
    );
    return {
      session: context.session,
      country: context.country,
      initialSuggestions:
        context.queryClient.getQueryData<HomepageResponse>(
          queryKeys.suggestions.byParams({
            limit: SUGGESTIONS_PAGE_SIZE,
            country: context.country,
          }),
        ),
      initialLists:
        context.queryClient.getQueryData<PaginatedUserListList>(
          queryKeys.lists.list(homeListParams(context.country)),
        ),
    };
  },
  component: HomeRoute,
});

function HomeRoute() {
  const { session, country, initialSuggestions, initialLists } =
    Route.useLoaderData();
  return (
    <HomeRouteShell
      session={session}
      country={country}
      initialSuggestions={initialSuggestions}
      initialLists={initialLists}
    />
  );
}
