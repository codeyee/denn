import { SortBy, SortOrder, PageSize } from "@/lib/types/listView";
import { Select } from "../../../common/ui/Select";
import { PaginationControls } from "../../../common/ui/PaginationControls";
import { ViewModeToggle } from "./ViewModeToggle";

interface ItemsHeaderProps {
  itemCount: number;
  viewMode: "list" | "gallery";
  sortBy: SortBy;
  hasGrouping: boolean;
  sortOrder: SortOrder;
  pageSize: PageSize;
  currentPage: number;
  totalPages: number;
  isReorderMode: boolean;
  onViewModeChange: (mode: "list" | "gallery") => void;
  onSortOrderChange: (order: SortOrder) => void;
  onPageSizeChange: (size: PageSize) => void;
  onPageChange: (page: number) => void;
}

export function ItemsHeader({
  itemCount,
  viewMode,
  sortBy,
  hasGrouping,
  sortOrder,
  pageSize,
  currentPage,
  totalPages,
  isReorderMode,
  onViewModeChange,
  onSortOrderChange,
  onPageSizeChange,
  onPageChange,
}: ItemsHeaderProps) {
  const showPageSortHint = sortBy !== "list_order";
  const showPageGroupHint = hasGrouping;

  return (
    <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-2xl font-bold text-white">Items</h2>
        <div className="text-white/60 text-sm">
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </div>
        {!isReorderMode && (
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1 bg-white/5 rounded-lg p-1">
              <Select
                value={sortOrder}
                onChange={(e) =>
                  onSortOrderChange(e.target.value as SortOrder)
                }
                className="px-2 py-1 text-xs rounded cursor-pointer bg-transparent hover:bg-white/10 text-white/60 hover:text-white transition-colors border-0"
              >
                <option value="asc">↑ Asc</option>
                <option value="desc">↓ Desc</option>
              </Select>
              <Select
                value={pageSize}
                onChange={(e) => {
                  onPageSizeChange(Number(e.target.value) as PageSize);
                }}
                className="px-2 py-1 text-xs rounded cursor-pointer bg-transparent hover:bg-white/10 text-white/60 hover:text-white transition-colors border-0"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </Select>
            </div>
            {totalPages > 1 && (
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={onPageChange}
              />
            )}
          </div>
        )}
        {(showPageSortHint || showPageGroupHint) && !isReorderMode && (
          <span className="text-xs text-amber-400/70 bg-amber-400/10 px-2 py-0.5 rounded-full">
            {showPageSortHint && showPageGroupHint
              ? "Sorted & grouped within page"
              : showPageSortHint
                ? "Sorted within page"
                : "Grouped within page"}
          </span>
        )}
      </div>

      <ViewModeToggle
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        disabled={isReorderMode}
      />
    </div>
  );
}
