import { Suspense } from "react";
import { redirect } from "next/navigation";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { Navbar } from "@/app/_components/layout/Navbar";
import { ContentDetailPage } from "@/app/_components/pages/ContentDetailPage";
import { ContentDetailSkeleton } from "@/app/_components/pages/ContentDetailPage/ContentDetailSkeleton";
import { ProtectedRoute } from "@/app/_components/common/providers/ProtectedRoute";
import {
  getCachedServerCountryCode,
  getCachedSession,
} from "@/lib/auth/session-server";
import {
  getServerQueryClient,
  prefetchContentDetailQueries,
} from "@/lib/api/queries/server";

interface ContentByIdPageProps {
  params: Promise<{ id: string }>;
}

export default async function ContentByIdPage({ params }: ContentByIdPageProps) {
  const { id } = await params;
  const contentId = Number.parseInt(id, 10);

  if (!Number.isFinite(contentId) || contentId <= 0) {
    redirect("/");
  }

  const session = await getCachedSession();
  const country = await getCachedServerCountryCode();
  const qc = getServerQueryClient();

  await prefetchContentDetailQueries(qc, session, contentId, country);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <div className="relative w-full overflow-x-hidden">
        <Suspense fallback={null}>
          <Navbar />
        </Suspense>
        <ProtectedRoute>
          <Suspense fallback={<ContentDetailSkeleton />}>
            <ContentDetailPage contentId={contentId} country={country} />
          </Suspense>
        </ProtectedRoute>
      </div>
    </HydrationBoundary>
  );
}
