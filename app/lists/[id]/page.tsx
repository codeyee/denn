"use client";

import { use } from "react";
import ListDetailPage from "@/app/_components/pages/ListDetailPage";
import { ProtectedRoute } from "@/app/_components/common/providers/ProtectedRoute";

export default function ListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const listId = parseInt(id);

  if (isNaN(listId)) {
    return (
      <div className="relative w-full min-h-screen bg-background-logged-in">
        <div className="container mx-auto px-4 mt-8 py-20">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-red-400 text-xl mb-4">Invalid list ID</p>
              <p className="text-gray-400">Please provide a valid list ID.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <ListDetailPage listId={listId} />
    </ProtectedRoute>
  );
}
