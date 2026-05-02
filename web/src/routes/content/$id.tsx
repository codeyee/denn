import { createFileRoute, redirect } from "@tanstack/react-router";

import { Navbar } from "@/components/layout/Navbar";
import { ContentDetailPage } from "@/components/pages/ContentDetailPage";
import { ContentDetailSkeleton } from "@/components/pages/ContentDetailPage/ContentDetailSkeleton";
import { ProtectedRoute } from "@/components/common/providers/ProtectedRoute";
import { prefetchContentDetailQueries } from "@/lib/api/queries/server";

export const Route = createFileRoute("/content/$id")({
  loader: async ({ context, params }) => {
    const contentId = Number.parseInt(params.id, 10);
    if (!Number.isFinite(contentId) || contentId <= 0) {
      throw redirect({ to: "/" });
    }

    await prefetchContentDetailQueries(
      context.queryClient,
      context.session,
      contentId,
      context.country,
    );

    return { contentId, country: context.country };
  },
  pendingComponent: () => (
    <div className="relative w-full overflow-x-hidden">
      <Navbar />
      <ContentDetailSkeleton />
    </div>
  ),
  component: ContentDetailRoute,
});

function ContentDetailRoute() {
  const { contentId, country } = Route.useLoaderData();
  return (
    <div className="relative w-full overflow-x-hidden">
      <Navbar />
      <ProtectedRoute>
        <ContentDetailPage contentId={contentId} country={country} />
      </ProtectedRoute>
    </div>
  );
}
