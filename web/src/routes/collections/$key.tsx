import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { ProtectedRoute } from "@/components/common/providers/ProtectedRoute";
import { requireAuthenticatedSession } from "@/lib/auth/protected-route";
import { useDynamicCollectionsQuery } from "@/lib/api/queries";

export const Route = createFileRoute("/collections/$key")({
  beforeLoad: ({ context, location }) => {
    requireAuthenticatedSession(context.session, location.pathname, location.searchStr);
  },
  component: DynamicCollectionRoute,
});

function DynamicCollectionRoute() {
  const { key } = Route.useParams();
  const navigate = useNavigate();
  const collectionsQuery = useDynamicCollectionsQuery();
  const collection = collectionsQuery.data?.collections.find(
    (item) => item.key === key,
  );

  useEffect(() => {
    if (!collection || !collectionsQuery.data?.enabled || !collection.enabled) {
      return;
    }
    void navigate({
      to: "/lists/$id",
      params: { id: String(collection.list_id) },
      replace: true,
    });
  }, [collection, collectionsQuery.data?.enabled, navigate]);

  return (
    <ProtectedRoute>
      <main
        id="main-content"
        tabIndex={-1}
        className="flex min-h-screen items-center justify-center bg-background-logged-in text-white/70"
      >
        {collectionsQuery.isLoading
          ? "Opening list…"
          : "This list is unavailable."}
      </main>
    </ProtectedRoute>
  );
}
