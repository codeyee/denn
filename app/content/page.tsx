"use client";

import { Suspense, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/_components/layout/Navbar";
import ContentDetailPage from "@/app/_components/pages/ContentDetailPage";
import { ProtectedRoute } from "@/app/_components/common/providers/ProtectedRoute";

function ContentPageContent({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const router = useRouter();
  const search = use(searchParams);

  // Check for external identifiers in query params
  const externalId = search.external_id as string | undefined;
  const sourceApi = search.source_api as string | undefined;
  const contentType = search.content_type as string | undefined;

  // Redirect to home if required query params are missing
  useEffect(() => {
    if (!externalId || !sourceApi || !contentType) {
      router.push('/');
    }
  }, [externalId, sourceApi, contentType, router]);

  if (externalId && sourceApi && contentType) {
    return (
      <ContentDetailPage
        externalId={externalId}
        sourceApi={sourceApi}
        contentType={contentType}
      />
    );
  }

  // Return null while redirecting
  return null;
}

export default function ContentPageWithQuery({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <div className="relative w-full overflow-x-hidden">
      <Suspense fallback={null}>
        <Navbar />
      </Suspense>
      <ProtectedRoute>
        <Suspense fallback={
          <div className="relative w-full min-h-screen bg-background-logged-in">
            <div className="container mx-auto px-4 mt-8 py-20">
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading...</p>
                </div>
              </div>
            </div>
          </div>
        }>
          <ContentPageContent searchParams={searchParams} />
        </Suspense>
      </ProtectedRoute>
    </div>
  );
}

