"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/app/_components/layout/Navbar";
import { ProtectedRoute } from "@/app/_components/common/providers/ProtectedRoute";
import { ContentType } from "@/lib/types";
import { contentItemActions } from "@/lib/api";
import { isValidContentType } from "@/lib/utils/contentTypeUtils";
import { buildContentUrlById } from "@/lib/utils/navigationUtils";

function LegacyContentRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const externalId = searchParams.get("external_id");
    const contentTypeRaw = searchParams.get("content_type");

    if (!externalId || !contentTypeRaw || !isValidContentType(contentTypeRaw)) {
      router.replace("/");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const item = await contentItemActions.getOrCreate(
          externalId,
          contentTypeRaw as ContentType
        );
        if (!cancelled) {
          router.replace(buildContentUrlById(item.id));
        }
      } catch (err) {
        console.error("Legacy content redirect failed:", err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to resolve content");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, router]);

  return (
    <div className="relative w-full min-h-screen bg-background-logged-in">
      <div className="container mx-auto px-4 mt-8 py-20">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            {error ? (
              <p className="text-red-400 text-xl">{error}</p>
            ) : (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-gray-400">Loading...</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LegacyContentPage() {
  return (
    <div className="relative w-full overflow-x-hidden">
      <Suspense fallback={null}>
        <Navbar />
      </Suspense>
      <ProtectedRoute>
        <Suspense fallback={null}>
          <LegacyContentRedirect />
        </Suspense>
      </ProtectedRoute>
    </div>
  );
}
