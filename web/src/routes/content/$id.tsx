import {
  createFileRoute,
  redirect,
  useRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";

import { Navbar } from "@/components/layout/Navbar";
import { ContentDetailPage } from "@/components/pages/ContentDetailPage";
import { ContentDetailSkeleton } from "@/components/pages/ContentDetailPage/ContentDetailSkeleton";
import { prefetchContentDetailQueries } from "@/lib/api/queries/server";
import type { ContentItem } from "@/lib/types";

export const Route = createFileRoute("/content/$id")({
  head: ({ loaderData }) => {
    const title = contentTitle(loaderData?.initialContentItem);
    return {
      meta: [
        { title: title ? `${title} | Denn` : "Content | Denn" },
        {
          name: "description",
          content: title
            ? `Explore details for ${title} in Denn's public catalog.`
            : "Explore this title in Denn's public catalog.",
        },
      ],
      links: loaderData?.contentId
        ? [{ rel: "canonical", href: `/content/${loaderData.contentId}` }]
        : [],
    };
  },
  loader: async ({ context, params }) => {
    const contentId = Number.parseInt(params.id, 10);
    if (!Number.isFinite(contentId) || contentId <= 0) {
      throw redirect({ to: "/" });
    }

    const initialContentItem = await prefetchContentDetailQueries(
      context.queryClient,
      context.session,
      contentId,
      context.country,
    );

    return {
      contentId,
      country: context.country,
      isAuthenticated: context.session.isAuthenticated,
      viewerId: context.session.user?.id,
      initialContentItem,
    };
  },
  pendingComponent: () => (
    <div className="relative w-full overflow-x-hidden">
      <Navbar />
      <ContentDetailSkeleton />
    </div>
  ),
  errorComponent: ContentDetailError,
  component: ContentDetailRoute,
});

function ContentDetailError({ error }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-screen items-center justify-center bg-background-logged-in px-6"
    >
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Could not open this content</h1>
        <p className="mt-3 text-sm text-gray-300">
          {error.message || "The detail request did not complete."}
        </p>
        <button
          type="button"
          className="mt-6 min-h-11 rounded-md bg-primary px-5 py-2 text-primary-foreground focus-visible:ring-4 focus-visible:ring-white/80"
          onClick={() => {
            void router.invalidate();
          }}
        >
          Retry
        </button>
      </div>
    </main>
  );
}

function contentTitle(item?: ContentItem) {
  if (!item?.source_data) return null;

  const sourceData =
    typeof item.source_data === "string"
      ? safeJsonObject(item.source_data)
      : item.source_data;

  if (
    sourceData &&
    "title" in sourceData &&
    typeof sourceData.title === "string"
  ) {
    return sourceData.title;
  }
  return null;
}

function safeJsonObject(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function ContentDetailRoute() {
  const {
    contentId,
    country,
    isAuthenticated,
    viewerId,
    initialContentItem,
  } =
    Route.useLoaderData();
  return (
    <div className="relative w-full overflow-x-hidden">
      <Navbar />
        <ContentDetailPage
          contentId={contentId}
          country={country}
          isAuthenticated={isAuthenticated}
          viewerId={viewerId}
        initialContentItem={initialContentItem as ContentItem | undefined}
      />
    </div>
  );
}
