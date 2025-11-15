import { GroupBy, SortOrder, PageSize } from "@/lib/types/listView";
import { Select } from "../../../common/ui/Select";
import { PaginationControls } from "../../../common/ui/PaginationControls";
import { ViewModeToggle } from "./ViewModeToggle";

interface ItemsHeaderProps {
  itemCount: number;
  viewMode: "list" | "gallery";
  primaryGroup: GroupBy;
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
  primaryGroup,
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
  return (
    <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-2xl font-bold text-white">Items</h2>
        <div className="text-white/60 text-sm">
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </div>
        {/* Pagination controls when NOT grouped */}
        {primaryGroup === "none" && !isReorderMode && (
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
                  const val = e.target.value;
                  onPageSizeChange(
                    val === "all" ? "all" : (Number(val) as PageSize)
                  );
                }}
                className="px-2 py-1 text-xs rounded cursor-pointer bg-transparent hover:bg-white/10 text-white/60 hover:text-white transition-colors border-0"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value="all">All</option>
              </Select>
            </div>
            {pageSize !== "all" && totalPages > 1 && (
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={onPageChange}
              />
            )}
          </div>
        )}
      </div>

      {/* View Toggle */}
      <ViewModeToggle
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        disabled={isReorderMode}
      />
    </div>
  );
}
