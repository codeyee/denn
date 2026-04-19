"use client";

import { Suspense, use } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/app/_components/layout/Navbar";
import { ContentDetailPage } from "@/app/_components/pages/ContentDetailPage";
import { ContentDetailSkeleton } from "@/app/_components/pages/ContentDetailPage/ContentDetailSkeleton";
import { ProtectedRoute } from "@/app/_components/common/providers/ProtectedRoute";

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
        <Suspense fallback={<ContentDetailSkeleton />}>
          <ContentByIdContent id={id} />
        </Suspense>
      </ProtectedRoute>
    </div>
  );
}
