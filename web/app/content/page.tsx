"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/app/_components/layout/Navbar";
import { ProtectedRoute } from "@/app/_components/common/providers/ProtectedRoute";
import { ContentType } from "@/lib/types";
import { isValidContentType } from "@/lib/utils/contentTypeUtils";
import { buildContentUrlById } from "@/lib/utils/navigationUtils";
import { useContentItemResolutionQuery } from "@/lib/api/queries";

function LegacyContentRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const externalId = searchParams.get("external_id") ?? "";
  const contentTypeRaw = searchParams.get("content_type") ?? "";
  const isValid = Boolean(externalId) && isValidContentType(contentTypeRaw);
  const resolution = useContentItemResolutionQuery(
    externalId,
    contentTypeRaw as ContentType,
    { enabled: isValid },
  );

  useEffect(() => {
    if (!isValid) {
      router.replace("/");
    }
  }, [isValid, router]);

  useEffect(() => {
    if (resolution.data) {
      router.replace(buildContentUrlById(resolution.data.id));
    }
  }, [resolution.data, router]);

  const error =
    resolution.error instanceof Error ? resolution.error.message : null;

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
