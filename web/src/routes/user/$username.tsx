import {
  createFileRoute,
  useRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";

import { Button } from "@/components/common/ui/Button";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import {
  PublicProfilePage,
  PublicProfileSkeleton,
} from "@/components/pages/PublicProfilePage";
import { pickRandomFavoriteBanner } from "@/components/pages/PublicProfilePage/utils";
import { prefetchPublicProfileQueries } from "@/lib/api/queries/server";
import {
  profileDataSearchKey,
  publicProfileSearchValidator,
} from "@/lib/profileSearch";

export const Route = createFileRoute("/user/$username")({
  validateSearch: publicProfileSearchValidator,
  loader: async ({ context, params, location }) => {
    const search = publicProfileSearchValidator.parse(location.search);
    const initialData = await prefetchPublicProfileQueries(
      context.queryClient,
      context.session,
      params.username,
      search,
    );
    return {
      username: params.username,
      initialSearch: search,
      initialData,
      bannerMedia: pickRandomFavoriteBanner(initialData.overview),
    };
  },
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} | Denn` },
      {
        name: "description",
        content: `See @${params.username}'s progress, ratings, reviews, favorites, and public lists on Denn.`,
      },
    ],
    links: [
      {
        rel: "canonical",
        href: `/user/${encodeURIComponent(params.username)}`,
      },
    ],
  }),
  pendingComponent: PublicProfileRoutePending,
  errorComponent: PublicProfileRouteError,
  component: PublicProfileRoute,
});

function PublicProfileRoute() {
  const { username, initialSearch, initialData, bannerMedia } =
    Route.useLoaderData();
  const search = Route.useSearch();
  const initialTabData = sameDataSearch(search, initialSearch)
    ? initialData.activeTab
    : null;
  return (
    <div className="relative min-h-screen bg-background-logged-in">
      <Navbar />
      <PublicProfilePage
        username={username}
        search={search}
        initialOverview={initialData.overview}
        initialTabData={initialTabData}
        initialBannerMedia={bannerMedia}
      />
      <Footer />
    </div>
  );
}

function sameDataSearch(
  current: ReturnType<typeof Route.useSearch>,
  initial: ReturnType<typeof Route.useSearch>,
) {
  return (
    profileDataSearchKey(current) === profileDataSearchKey(initial)
  );
}

function PublicProfileRoutePending() {
  return (
    <div className="relative min-h-screen bg-background-logged-in">
      <Navbar />
      <PublicProfileSkeleton />
    </div>
  );
}

function PublicProfileRouteError({ error }: ErrorComponentProps) {
  const router = useRouter();
  const isNotFound = error.message.includes("(404)");

  return (
    <div className="min-h-screen bg-background-logged-in">
      <Navbar />
      <main
        id="main-content"
        tabIndex={-1}
        className="grid min-h-screen place-items-center px-6 text-center"
      >
        <div className="max-w-md">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-fuchsia-300">
            {isNotFound ? "Profile not found" : "Profile unavailable"}
          </p>
          <h1 className="mt-3 text-3xl font-black">
            {isNotFound
              ? "This user does not exist."
              : "We could not load this profile."}
          </h1>
          <p className="mt-3 text-sm text-white/60">
            {isNotFound
              ? "Check the username in the URL and try again."
              : "The public profile request did not complete."}
          </p>
          <Button
            className="mt-6"
            onClick={() => void router.invalidate()}
          >
            Retry
          </Button>
        </div>
      </main>
    </div>
  );
}
