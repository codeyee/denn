import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { dynamicCollectionActions } from "@/lib/api";
import { queryKeys, useDynamicCollectionsQuery } from "@/lib/api/queries";

export function DynamicCollectionsPreference() {
  const queryClient = useQueryClient();
  const collectionsQuery = useDynamicCollectionsQuery();
  const [error, setError] = useState<string | null>(null);
  const data = collectionsQuery.data;

  async function save(data: {
    enabled?: boolean;
    collections?: Array<{ key: string; enabled: boolean }>;
  }) {
    setError(null);
    try {
      const updated = await dynamicCollectionActions.updateSettings(data);
      queryClient.setQueryData(queryKeys.dynamicCollections.all, updated);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not save collections.");
    }
  }

  return (
    <section className="mt-8 border-t border-gray-700 pt-6" aria-labelledby="dynamic-collections-heading">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 id="dynamic-collections-heading" className="text-lg font-semibold">Dynamic collections</h2>
          <p className="mt-1 max-w-xl text-sm text-gray-300">
            Automatically group your tracked content by progress status and content type. These views never change your manual lists.
          </p>
        </div>
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-3">
          <span className="sr-only">Enable dynamic collections</span>
          <input
            type="checkbox"
            className="h-5 w-5 accent-primary"
            checked={data?.enabled ?? true}
            disabled={!data || collectionsQuery.isFetching}
            onChange={(event) => void save({ enabled: event.target.checked })}
          />
          <span aria-hidden="true">{data?.enabled === false ? "Off" : "On"}</span>
        </label>
      </div>
      {data?.enabled ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {data.collections.map((collection) => (
            <label key={collection.key} className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-white/10 px-3 py-2 text-sm">
              <span>{collection.name}</span>
              <input
                type="checkbox"
                className="h-5 w-5 accent-primary"
                checked={collection.enabled}
                disabled={collectionsQuery.isFetching}
                onChange={(event) => void save({ collections: [{ key: collection.key, enabled: event.target.checked }] })}
                aria-label={`Show ${collection.name} dynamic collection`}
              />
            </label>
          ))}
        </div>
      ) : null}
      <p className="mt-3 text-sm text-gray-400" aria-live="polite">
        {collectionsQuery.isLoading ? "Loading collections…" : error}
      </p>
    </section>
  );
}
