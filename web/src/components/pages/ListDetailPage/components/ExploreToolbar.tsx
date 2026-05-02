
import { ArrowDown, ArrowUp, Filter, Layers, Plus, Trash2, Wand2, X } from "lucide-react";

import { Button } from "@/components/common/ui/Button";
import { Select } from "@/components/common/ui/Select";
import {
  FilterField,
  GroupByField,
  ListItemQuery,
  PageSize,
  SortClause,
  SortField,
} from "@/lib/types/listView";

interface ExploreToolbarProps {
  query: ListItemQuery;
  totalItemCount: number;
  isReorderMode: boolean;
  canApplySort: boolean;
  applySortHint?: string;
  applySortPending?: boolean;
  onSetSort: (sort: SortClause[]) => void;
  onSetGroupBy: (groupBy: GroupByField | null) => void;
  onSetFilter: (
    field: FilterField,
    value: string | string[] | number | number[] | null,
  ) => void;
  onSetPageSize: (pageSize: PageSize) => void;
  onResetExploration: () => void;
  onApplySortAsListOrder?: () => void;
}

const SORT_FIELD_OPTIONS: Array<{ value: SortField; label: string }> = [
  { value: "list_order", label: "Default order" },
  { value: "added_at", label: "Date added" },
  { value: "completed_at", label: "Date completed" },
  { value: "list_rating", label: "List rating" },
  { value: "display_title", label: "Title" },
  { value: "artist", label: "Artist" },
  { value: "album_title", label: "Album title" },
  { value: "release_date", label: "Release date" },
  { value: "status", label: "Status" },
  { value: "content_type", label: "Content type" },
];

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "COMPLETED", label: "Completed" },
];

const CONTENT_TYPE_OPTIONS = [
  { value: "MOVIE", label: "Movies" },
  { value: "TV_SHOW", label: "TV shows" },
  { value: "SEASON", label: "Seasons" },
  { value: "ALBUM", label: "Albums" },
  { value: "GAME", label: "Games" },
  { value: "BOOK", label: "Books" },
];

const GROUP_BY_OPTIONS: Array<{ value: GroupByField | ""; label: string }> = [
  { value: "", label: "No grouping" },
  { value: "status", label: "Status" },
  { value: "content_type", label: "Content type" },
  { value: "source_api", label: "Source" },
  { value: "added_by", label: "Added by" },
  { value: "artist", label: "Artist" },
];

function singleFilterValue(
  filters: ListItemQuery["filters"],
  field: FilterField,
): string {
  const v = filters[field];
  if (Array.isArray(v)) return v.length === 1 ? String(v[0]) : "";
  return v === undefined || v === null ? "" : String(v);
}

export function ExploreToolbar({
  query,
  totalItemCount,
  isReorderMode,
  canApplySort,
  applySortHint,
  applySortPending,
  onSetSort,
  onSetGroupBy,
  onSetFilter,
  onSetPageSize,
  onResetExploration,
  onApplySortAsListOrder,
}: ExploreToolbarProps) {
  if (isReorderMode) return null;

  const handleAddSort = () => {
    const used = new Set(query.sort.map((c) => c.field));
    const next = SORT_FIELD_OPTIONS.find((o) => !used.has(o.value));
    if (!next) return;
    onSetSort([...query.sort, { field: next.value, direction: "asc" }]);
  };

  const handleSortFieldChange = (index: number, field: SortField) => {
    const next = query.sort.map((c, i) => (i === index ? { ...c, field } : c));
    onSetSort(next);
  };

  const handleSortDirToggle = (index: number) => {
    const next: SortClause[] = query.sort.map((c, i) =>
      i === index
        ? { ...c, direction: c.direction === "asc" ? "desc" : "asc" }
        : c,
    );
    onSetSort(next);
  };

  const handleRemoveSort = (index: number) => {
    onSetSort(query.sort.filter((_, i) => i !== index));
  };

  return (
    <section
      className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 space-y-4"
      aria-label="Explore toolbar"
    >
      <header className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-white">
          <Filter className="w-4 h-4 text-white/60" />
          <span className="font-semibold">Explore</span>
          <span className="text-white/50 text-sm">
            {totalItemCount} {totalItemCount === 1 ? "item" : "items"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={query.pageSize}
            onChange={(e) => onSetPageSize(Number(e.target.value) as PageSize)}
            className="px-2 py-1 text-xs rounded cursor-pointer bg-white/5 hover:bg-white/10 text-white border border-white/10"
            aria-label="Page size"
          >
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
          </Select>
          <Button
            onClick={onResetExploration}
            variant="outline"
            size="sm"
            className="text-xs flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Reset
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wide text-white/50">
            Status
          </label>
          <Select
            value={singleFilterValue(query.filters, "status")}
            onChange={(e) =>
              onSetFilter("status", e.target.value || null)
            }
            className="w-full px-3 py-2 text-sm rounded-md bg-white/5 hover:bg-white/10 text-white border border-white/10"
          >
            <option value="">All</option>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wide text-white/50">
            Content type
          </label>
          <Select
            value={singleFilterValue(query.filters, "content_type")}
            onChange={(e) =>
              onSetFilter("content_type", e.target.value || null)
            }
            className="w-full px-3 py-2 text-sm rounded-md bg-white/5 hover:bg-white/10 text-white border border-white/10"
          >
            <option value="">All</option>
            {CONTENT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wide text-white/50 flex items-center gap-1">
            <Layers className="w-3 h-3" /> Group by
          </label>
          <Select
            value={query.groupBy ?? ""}
            onChange={(e) =>
              onSetGroupBy(
                e.target.value === ""
                  ? null
                  : (e.target.value as GroupByField),
              )
            }
            className="w-full px-3 py-2 text-sm rounded-md bg-white/5 hover:bg-white/10 text-white border border-white/10"
          >
            {GROUP_BY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-white/50">
            Sort
          </span>
          <button
            type="button"
            onClick={handleAddSort}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            disabled={query.sort.length >= SORT_FIELD_OPTIONS.length}
          >
            <Plus className="w-3 h-3" /> Add field
          </button>
        </div>

        {query.sort.length === 0 ? (
          <p className="text-sm text-white/50">
            No explicit sort — items follow the canonical list order.
          </p>
        ) : (
          <ol className="space-y-2">
            {query.sort.map((clause, index) => (
              <li
                key={`${clause.field}-${index}`}
                className="flex items-center gap-2"
              >
                <span className="text-xs font-mono text-white/40 w-5 text-right">
                  {index + 1}.
                </span>
                <Select
                  value={clause.field}
                  onChange={(e) =>
                    handleSortFieldChange(index, e.target.value as SortField)
                  }
                  className="flex-1 px-3 py-1.5 text-sm rounded-md bg-white/5 hover:bg-white/10 text-white border border-white/10"
                >
                  {SORT_FIELD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
                <button
                  type="button"
                  onClick={() => handleSortDirToggle(index)}
                  className="px-2 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-white border border-white/10 text-sm flex items-center gap-1"
                  aria-label={`Toggle direction for ${clause.field}`}
                >
                  {clause.direction === "asc" ? (
                    <ArrowUp className="w-3 h-3" />
                  ) : (
                    <ArrowDown className="w-3 h-3" />
                  )}
                  {clause.direction.toUpperCase()}
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveSort(index)}
                  className="px-2 py-1.5 rounded-md bg-white/5 hover:bg-red-500/20 text-white/70 hover:text-red-300 border border-white/10"
                  aria-label="Remove sort field"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>

      {onApplySortAsListOrder && (
        <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 flex-wrap">
          <p className="text-xs text-white/50 flex-1 min-w-0">
            {applySortHint ??
              "Promote the current sort to the canonical list order."}
          </p>
          <Button
            onClick={onApplySortAsListOrder}
            disabled={!canApplySort || applySortPending}
            size="sm"
            className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white"
            title={
              canApplySort
                ? undefined
                : "Disabled when filters or grouping are active, or when no sort is set."
            }
          >
            <Wand2 className="w-3 h-3" />
            {applySortPending ? "Applying..." : "Apply sort as list order"}
          </Button>
        </div>
      )}
    </section>
  );
}
