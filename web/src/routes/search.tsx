import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { SearchRouteShell } from "@/components/routes/SearchRouteShell";
import { prefetchSearchQuery } from "@/lib/api/queries/server";

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
    };
  },
  component: SearchRoute,
});

function SearchRoute() {
  const { session, country, initialQuery } = Route.useLoaderData();
  return (
    <SearchRouteShell
      session={session}
      country={country}
      initialQuery={initialQuery}
    />
  );
}
