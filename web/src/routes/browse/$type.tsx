import {
  createFileRoute,
  redirect,
  stripSearchParams,
  useRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { z } from "zod";

import { BrowsePage, type BrowsePageSearch } from "@/components/pages/BrowsePage";
import { BrowseSkeleton } from "@/components/pages/BrowsePage/components/BrowseSkeleton";
import { Navbar } from "@/components/layout/Navbar";
import { CONTENT_TYPE_DEFINITIONS } from "@/lib/contentTypes";
import {
  prefetchBrowseQuery,
  queryKeys,
} from "@/lib/api/queries";
import { ContentType, type BrowseResponse, type BrowseType } from "@/lib/types";

const browseSearchSchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100).optional().catch(1),
    sort: z.enum(["popular", "recent"]).optional().catch("popular"),
    q: z.string().trim().max(80).optional().catch(undefined),
  })
  .transform(({ page = 1, sort = "popular", q }) => {
    const query = q?.trim() ?? "";
    return query
      ? { page, sort: "popular" as const, q: query }
      : { page, sort };
  });

export const Route = createFileRoute("/browse/$type")({
  validateSearch: browseSearchSchema,
  search: {
    middlewares: [stripSearchParams({ page: 1, sort: "popular" })],
  },
  beforeLoad: ({ params, search, location }) => {
    const type = toBrowseType(params.type);
    if (!type) {
      throw redirect({ to: "/browse" });
    }

    const actualQuery = location.searchStr.replace(/^\?/, "");
    const normalizedSearch = browseSearchSchema.parse(search);
    const normalizedQuery = normalizedBrowseQuery(normalizedSearch);
    if (actualQuery !== normalizedQuery) {
      throw redirect({
        to: "/browse/$type",
        params: { type },
        search: normalizedSearch,
        replace: true,
      });
    }
  },
  loaderDeps: ({ search }) => ({
    page: search.page,
    sort: search.sort,
    query: search.q ?? "",
  }),
  loader: async ({ context, params, deps }) => {
    const type = toBrowseType(params.type);
    if (!type) {
      throw redirect({ to: "/browse" });
    }

    await prefetchBrowseQuery(
      context.queryClient,
      type,
      deps.page,
      deps.sort,
      deps.query,
      context.country,
    );
    const search: BrowsePageSearch = deps.query
      ? { page: deps.page, sort: "popular", q: deps.query }
      : { page: deps.page, sort: deps.sort };

    return {
      type,
      search,
      country: context.country,
      initialData: context.queryClient.getQueryData<BrowseResponse>(
        queryKeys.browse.byParams({
          type,
          page: deps.page,
          sort: deps.sort,
          query: deps.query || undefined,
          country: context.country,
        }),
      ),
    };
  },
  head: ({ params, loaderData }) => {
    const type = toBrowseType(params.type);
    const definition = type ? CONTENT_TYPE_DEFINITIONS[definitionType(type)] : null;
    const search = loaderData?.search;
    const familyPath = type ? `/browse/${type}` : "/browse";
    const canonical = search && !search.q
      ? `${familyPath}${canonicalSearch(search)}`
      : familyPath;
    const title = definition ? `Browse ${definition.pluralLabel}` : "Browse catalog";
    return {
      meta: [
        { title: `${title} | Denn` },
        {
          name: "description",
          content: definition
            ? `Explore popular and recent ${definition.pluralLabel.toLowerCase()} in Denn's public catalog.`
            : "Explore Denn's public catalog.",
        },
        ...(search?.q ? [{ name: "robots", content: "noindex,follow" }] : []),
      ],
      links: [{ rel: "canonical", href: canonical }],
    };
  },
  pendingComponent: () => (
    <div className="min-h-screen bg-background-logged-in px-4 pb-20 pt-28 md:px-8 lg:pt-36">
      <Navbar />
      <div className="mx-auto max-w-[112rem]">
        <div className="h-10 w-72 animate-pulse rounded bg-white/10 motion-reduce:animate-none" />
        <div className="mt-6 h-24 rounded-xl border border-white/10 bg-white/[0.04]" />
        <div className="mt-8"><BrowseSkeleton /></div>
      </div>
    </div>
  ),
  errorComponent: BrowseRouteError,
  component: BrowseRoute,
});

function BrowseRoute() {
  const { type, search, country, initialData } = Route.useLoaderData();
  return <BrowsePage type={type} search={search} country={country} initialData={initialData} />;
}

function BrowseRouteError({ error }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <main id="main-content" tabIndex={-1} className="grid min-h-screen place-items-center bg-background-logged-in px-6 text-center">
      <div className="max-w-md">
        <h1 className="text-2xl font-semibold text-white">Could not load this browse page</h1>
        <p className="mt-3 text-sm text-white/65">{error.message || "The catalog request did not complete."}</p>
        <button
          type="button"
          className="mt-6 min-h-11 rounded-md bg-primary px-5 py-2 text-primary-foreground focus-visible:ring-4 focus-visible:ring-white/80"
          onClick={() => void router.invalidate()}
        >
          Retry
        </button>
      </div>
    </main>
  );
}

function toBrowseType(value: string): BrowseType | null {
  return ["movies", "tv-shows", "games", "music", "books"].includes(value)
    ? (value as BrowseType)
    : null;
}

function definitionType(type: BrowseType) {
  switch (type) {
    case "movies": return ContentType.MOVIE;
    case "tv-shows": return ContentType.TV_SHOW;
    case "games": return ContentType.GAME;
    case "music": return ContentType.ALBUM;
    case "books": return ContentType.BOOK;
  }
}

function canonicalSearch(search: BrowsePageSearch) {
  const value = normalizedBrowseQuery(search);
  return value ? `?${value}` : "";
}

function normalizedBrowseQuery(search: BrowsePageSearch) {
  const params = new URLSearchParams();
  if (search.q) params.set("q", search.q);
  if (!search.q && search.sort !== "popular") params.set("sort", search.sort);
  if (search.page > 1) params.set("page", String(search.page));
  return params.toString();
}
