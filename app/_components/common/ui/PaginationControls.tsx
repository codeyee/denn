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
    <div className={cn("flex items-center gap-1", className)}>
      <button
        onClick={() => onPageChange(1)}
        disabled={isFirstPage}
        className="p-1 rounded cursor-pointer bg-white/5 hover:bg-white/10 text-white border border-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
        title="First page"
        aria-label="Go to first page"
      >
        <ChevronsLeft className="w-3 h-3" />
      </button>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={isFirstPage}
        className="p-1 rounded cursor-pointer bg-white/5 hover:bg-white/10 text-white border border-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
        title="Previous page"
        aria-label="Go to previous page"
      >
        <ChevronLeft className="w-3 h-3" />
      </button>
      <span className="text-xs text-white/60 px-1 min-w-[60px] text-center">
        {currentPage}/{totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={isLastPage}
        className="p-1 rounded cursor-pointer bg-white/5 hover:bg-white/10 text-white border border-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
        title="Next page"
        aria-label="Go to next page"
      >
        <ChevronRight className="w-3 h-3" />
      </button>
      <button
        onClick={() => onPageChange(totalPages)}
        disabled={isLastPage}
        className="p-1 rounded cursor-pointer bg-white/5 hover:bg-white/10 text-white border border-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
        title="Last page"
        aria-label="Go to last page"
      >
        <ChevronsRight className="w-3 h-3" />
      </button>
    </div>
  );
}
