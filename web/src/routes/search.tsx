import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { SearchRouteShell } from "@/components/routes/SearchRouteShell";
import {
  queryKeys,
  SEARCH_RESULT_LIMIT,
} from "@/lib/api/queries";
import { prefetchSearchQuery } from "@/lib/api/queries/server";
import type { MultiSearchResponse } from "@/lib/types";

const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/search")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ q: search.q?.trim() ?? "" }),
  loader: async ({ context, deps }) => {
    await prefetchSearchQuery(
      context.queryClient,
      context.session,
      deps.q,
      context.country,
    );
    return {
      session: context.session,
      country: context.country,
      initialQuery: deps.q,
      initialResults:
        context.queryClient.getQueryData<MultiSearchResponse>(
          queryKeys.search.multi({
            query: deps.q,
            limit: SEARCH_RESULT_LIMIT,
            country: context.country,
            allowAdult:
              context.session.user?.allow_adult_content ?? false,
          }),
        ),
    };
  },
  component: SearchRoute,
});

function SearchRoute() {
  const { session, country, initialQuery, initialResults } =
    Route.useLoaderData();
  return (
    <SearchRouteShell
      session={session}
      country={country}
      initialQuery={initialQuery}
      initialResults={initialResults}
    />
  );
}
