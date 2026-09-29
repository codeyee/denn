import { createFileRoute } from "@tanstack/react-router";

import { HomeRouteShell } from "@/components/routes/HomeRouteShell";
import {
  HOME_PROGRESS_SEARCH,
  queryKeys,
  SUGGESTIONS_PAGE_SIZE,
} from "@/lib/api/queries";
import { homeListParams, prefetchHomeQueries } from "@/lib/api/queries/server";
import type {
  HomepageResponse,
  PaginatedProfileResults,
  PaginatedUserListList,
  PublicProgressItem,
} from "@/lib/types";
import { getWebModerationVisibilityEnabledFn } from "@/server/moderation-visibility";

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
    const moderationVisibilityEnabled =
      await getWebModerationVisibilityEnabledFn();
    await prefetchHomeQueries(
      context.queryClient,
      context.session,
      context.country,
      moderationVisibilityEnabled,
    );
    return {
      session: context.session,
      country: context.country,
      moderationVisibilityEnabled,
      initialSuggestions:
        context.queryClient.getQueryData<HomepageResponse>(
          queryKeys.suggestions.byParams({
            limit: SUGGESTIONS_PAGE_SIZE,
            country: context.country,
            moderationVisibilityEnabled,
          }),
        ),
      initialLists:
        context.queryClient.getQueryData<PaginatedUserListList>(
          queryKeys.lists.list(homeListParams(context.country)),
        ),
      initialProgress: context.session.user
        ? context.queryClient.getQueryData<
            PaginatedProfileResults<PublicProgressItem>
          >(
            queryKeys.profiles.tab(
              context.session.user.username,
              "progress",
              HOME_PROGRESS_SEARCH,
            ),
          )
        : undefined,
    };
  },
  component: HomeRoute,
});

function HomeRoute() {
  const {
    session,
    country,
    moderationVisibilityEnabled,
    initialSuggestions,
    initialLists,
    initialProgress,
  } = Route.useLoaderData();
  return (
    <HomeRouteShell
      session={session}
      country={country}
      moderationVisibilityEnabled={moderationVisibilityEnabled}
      initialSuggestions={initialSuggestions}
      initialLists={initialLists}
      initialProgress={initialProgress}
    />
  );
}
