"use client";

import { Suspense, use } from "react";
import Navbar from "@/app/_components/layout/Navbar";
import ContentDetailPage from "@/app/_components/pages/ContentDetailPage";
import { ProtectedRoute } from "@/app/_components/common/ProtectedRoute";

function ContentPageContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const contentId = parseInt(id, 10);

  if (isNaN(contentId)) {
    return (
      <div className="relative w-full min-h-screen bg-background-logged-in">
        <div className="container mx-auto px-4 py-20">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-red-400 text-xl mb-4">Invalid content ID</p>
              <p className="text-gray-400">The content ID must be a valid number.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <ContentDetailPage contentId={contentId} />;
}

export default function ContentPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="relative w-full overflow-x-hidden">
      <Suspense fallback={null}>
        <Navbar />
      </Suspense>
      <ProtectedRoute>
        <Suspense fallback={
          <div className="relative w-full min-h-screen bg-background-logged-in">
            <div className="container mx-auto px-4 py-20">
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading...</p>
                </div>
              </div>
            </div>
          </div>
        }>
          <ContentPageContent params={params} />
        </Suspense>
      </ProtectedRoute>
    </div>
  );
}

