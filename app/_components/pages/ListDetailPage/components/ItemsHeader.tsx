import { PaginationControls } from "../../../common/ui/PaginationControls";
import { ViewModeToggle } from "./ViewModeToggle";

interface ItemsHeaderProps {
  itemCount: number;
  viewMode: "list" | "gallery";
  currentPage: number;
  totalPages: number;
  isReorderMode: boolean;
  onViewModeChange: (mode: "list" | "gallery") => void;
  onPageChange: (page: number) => void;
}

export function ItemsHeader({
  itemCount,
  viewMode,
  currentPage,
  totalPages,
  isReorderMode,
  onViewModeChange,
  onPageChange,
}: ItemsHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-2xl font-bold text-white">Items</h2>
        <div className="text-white/60 text-sm">
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </div>
        {!isReorderMode && totalPages > 1 && (
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
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
