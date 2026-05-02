import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";

import { Navbar } from "@/components/layout/Navbar";
import { ProtectedRoute } from "@/components/common/providers/ProtectedRoute";
import { ContentType } from "@/lib/types";
import { isValidContentType } from "@/lib/utils/contentTypeUtils";
import { buildContentUrlById } from "@/lib/utils/navigationUtils";
import { useContentItemResolutionQuery } from "@/lib/api/queries";

const legacySearchSchema = z.object({
  external_id: z.string().optional().catch(undefined),
  source_api: z.string().optional().catch(undefined),
  content_type: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/content/")({
  validateSearch: legacySearchSchema,
  component: LegacyContentRoute,
});

function LegacyContentRoute() {
  return (
    <div className="relative w-full overflow-x-hidden">
      <Navbar />
      <ProtectedRoute>
        <LegacyContentRedirect />
      </ProtectedRoute>
    </div>
  );
}

function LegacyContentRedirect() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const externalId = search.external_id ?? "";
  const contentTypeRaw = search.content_type ?? "";
  const isValid = Boolean(externalId) && isValidContentType(contentTypeRaw);
  const resolution = useContentItemResolutionQuery(
    externalId,
    contentTypeRaw as ContentType,
    { enabled: isValid },
  );

  useEffect(() => {
    if (!isValid) {
      void navigate({ to: "/", replace: true });
    }
  }, [isValid, navigate]);

  useEffect(() => {
    if (resolution.data) {
      void navigate({
        to: buildContentUrlById(resolution.data.id),
        replace: true,
      });
    }
  }, [resolution.data, navigate]);

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
