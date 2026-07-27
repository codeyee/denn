import { useEffect, useMemo, useState } from "react";
import { ListItem, PaginationMetadata } from "@/lib/types";
import { GroupByField, GroupedItems } from "@/lib/types/listView";

interface UseViewerStateOptions {
  pageItems: ListItem[];
  pageMetadata: PaginationMetadata | null;
  groupBy: GroupByField | null;
  isReorderMode: boolean;
}

interface UseViewerStateReturn {
  viewMode: "list" | "gallery";
  setViewMode: (mode: "list" | "gallery") => void;
  highlightedItemId: number | null;
  setHighlightedItemId: (id: number | null) => void;
  displayItems: ListItem[];
  groupedItems: GroupedItems<ListItem>[] | null;
  isViewerLoading: boolean;
}

/**
 * Resolve the group key for a given list item, mirroring the backend's
 * `_resolve_group_key` so the page-side grouping renders match the
 * server-emitted `metadata.groups` order.
 */
function resolveGroupKey(item: ListItem, groupBy: GroupByField): string {
  switch (groupBy) {
    case "context_status":
      return item.context_status ?? "";
    case "content_type":
      return item.content_item.content_type;
    case "source_api":
      return item.content_item.source_api;
    case "added_by":
      return String(item.added_by?.id ?? "");
    case "artist": {
      const sourceData = item.content_item.source_data as
        | { artists?: Array<{ name?: string } | string> }
        | undefined;
      const first = sourceData?.artists?.[0];
      if (typeof first === "string") return first;
      return first?.name ?? "";
    }
    default:
      return "";
  }
}

function buildGroupedItems(
  items: ListItem[],
  metadata: PaginationMetadata | null,
  groupBy: GroupByField,
): GroupedItems<ListItem>[] {
  const groupsMeta = metadata?.groups ?? [];
  // Use server-provided ordering when available; otherwise fall back to
  // the order items appear in the page.
  const order: string[] = groupsMeta.length
    ? groupsMeta.map((g) => g.key)
    : Array.from(new Set(items.map((it) => resolveGroupKey(it, groupBy))));

  const labelMap = new Map(groupsMeta.map((g) => [g.key, g.label]));
  const globalCountMap = new Map(groupsMeta.map((g) => [g.key, g.count_global]));

  const buckets = new Map<string, ListItem[]>();
  for (const key of order) buckets.set(key, []);
  for (const item of items) {
    const key = resolveGroupKey(item, groupBy);
    if (!buckets.has(key)) {
      buckets.set(key, []);
      order.push(key);
    }
    buckets.get(key)!.push(item);
  }

  return order
    .map((key) => {
      const bucket = buckets.get(key) ?? [];
      const label = labelMap.get(key) ?? (key || "Sin valor");
      const globalCount = globalCountMap.get(key) ?? bucket.length;
      return {
        groupKey: key || "__none__",
        groupLabel: label,
        items: bucket,
        count: globalCount,
        groupAttributes: [],
      } satisfies GroupedItems<ListItem>;
    })
    .filter((g) => g.items.length > 0);
}

export function useViewerState({
  pageItems,
  pageMetadata,
  groupBy,
  isReorderMode,
}: UseViewerStateOptions): UseViewerStateReturn {
  const [viewMode, setViewMode] = useState<"list" | "gallery">("list");
  const [highlightedItemId, setHighlightedItemId] = useState<number | null>(null);

  const groupedItems = useMemo<GroupedItems<ListItem>[] | null>(() => {
    if (!groupBy || isReorderMode) return null;
    return buildGroupedItems(pageItems, pageMetadata, groupBy);
  }, [pageItems, pageMetadata, groupBy, isReorderMode]);

  useEffect(() => {
    if (!highlightedItemId || isReorderMode) return;
    const scrollTimer = window.setTimeout(() => {
      const target = document.querySelector<HTMLElement>(
        `[data-list-item-id="${highlightedItemId}"]`,
      );
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    const clearTimer = window.setTimeout(() => {
      setHighlightedItemId(null);
    }, 3000);
    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [highlightedItemId, isReorderMode, viewMode]);

  return {
    viewMode,
    setViewMode,
    highlightedItemId,
    setHighlightedItemId,
    displayItems: pageItems,
    groupedItems,
    isViewerLoading: false,
  };
}
