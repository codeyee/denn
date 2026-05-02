import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils/tailwindUtils";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationControlsProps) {
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={cn("inline-flex items-center gap-1 bg-white/5 rounded-lg p-1", className)}>
      <button
        onClick={() => onPageChange(1)}
        disabled={isFirstPage}
        className={cn(
          "p-1.5 rounded transition-colors cursor-pointer",
          isFirstPage
            ? "text-white/30 cursor-not-allowed"
            : "text-white/60 hover:text-white hover:bg-white/10"
        )}
        title="First page"
        aria-label="Go to first page"
      >
        <ChevronsLeft className="w-4 h-4" />
      </button>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={isFirstPage}
        className={cn(
          "p-1.5 rounded transition-colors cursor-pointer",
          isFirstPage
            ? "text-white/30 cursor-not-allowed"
            : "text-white/60 hover:text-white hover:bg-white/10"
        )}
        title="Previous page"
        aria-label="Go to previous page"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-xs text-white font-medium px-2 min-w-[60px] text-center">
        {currentPage}/{totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={isLastPage}
        className={cn(
          "p-1.5 rounded transition-colors cursor-pointer",
          isLastPage
            ? "text-white/30 cursor-not-allowed"
            : "text-white/60 hover:text-white hover:bg-white/10"
        )}
        title="Next page"
        aria-label="Go to next page"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
      <button
        onClick={() => onPageChange(totalPages)}
        disabled={isLastPage}
        className={cn(
          "p-1.5 rounded transition-colors cursor-pointer",
          isLastPage
            ? "text-white/30 cursor-not-allowed"
            : "text-white/60 hover:text-white hover:bg-white/10"
        )}
        title="Last page"
        aria-label="Go to last page"
      >
        <ChevronsRight className="w-4 h-4" />
      </button>
    </div>
  );
}
