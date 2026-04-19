"use client";

import { Suspense, use } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/app/_components/layout/Navbar";
import { ContentDetailPage } from "@/app/_components/pages/ContentDetailPage";
import { ProtectedRoute } from "@/app/_components/common/providers/ProtectedRoute";

function ContentByIdLoading() {
  return (
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
  );
}

function ContentByIdContent({ id }: { id: string }) {
  const router = useRouter();
  const numericId = Number.parseInt(id, 10);

  if (!Number.isFinite(numericId) || numericId <= 0) {
    if (typeof window !== "undefined") {
      router.replace("/");
    }
    return null;
  }

  return <ContentDetailPage contentId={numericId} />;
}

interface ContentByIdPageProps {
  params: Promise<{ id: string }>;
}

export default function ContentByIdPage({ params }: ContentByIdPageProps) {
  const { id } = use(params);

  return (
    <div className="relative w-full overflow-x-hidden">
      <Suspense fallback={null}>
        <Navbar />
      </Suspense>
      <ProtectedRoute>
        <Suspense fallback={<ContentByIdLoading />}>
          <ContentByIdContent id={id} />
        </Suspense>
      </ProtectedRoute>
    </div>
  );
}
