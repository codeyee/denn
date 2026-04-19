import { useState, useMemo, useCallback } from "react";

const MIN_PAGE = 1;
const DEFAULT_INITIAL_PAGE = 1;

interface UsePaginationOptions<T> {
  items: T[];
  pageSize: number | "all";
  initialPage?: number;
}

interface UsePaginationReturn<T> {
  currentPage: number;
  totalPages: number;
  currentItems: T[];
  totalItems: number;
  startIndex: number;
  endIndex: number;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  setPageSize: (size: number | "all") => void;
}

function calculateTotalPages(
  totalItems: number,
  pageSize: number | "all"
): number {
  if (pageSize === "all" || totalItems === 0) {
    return MIN_PAGE;
  }
  return Math.ceil(totalItems / pageSize);
}

function calculateValidPage(page: number, totalPages: number): number {
  return Math.max(MIN_PAGE, Math.min(page, totalPages));
}

function calculatePaginationIndices(
  currentPage: number,
  pageSize: number,
  totalItems: number
): { startIndex: number; endIndex: number } {
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  return { startIndex, endIndex };
}

export function usePagination<T>({
  items,
  pageSize: initialPageSize,
  initialPage = DEFAULT_INITIAL_PAGE,
}: UsePaginationOptions<T>): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState<number | "all">(initialPageSize);

  const totalItems = items.length;

  const totalPages = useMemo(
    () => calculateTotalPages(totalItems, pageSize),
    [totalItems, pageSize]
  );

  const paginatedData = useMemo(() => {
    if (pageSize === "all") {
      return {
        currentItems: items,
        startIndex: 0,
        endIndex: totalItems,
      };
    }

    const { startIndex, endIndex } = calculatePaginationIndices(
      currentPage,
      pageSize,
      totalItems
    );
    const currentItems = items.slice(startIndex, endIndex);

    return {
      currentItems,
      startIndex,
      endIndex,
    };
  }, [items, currentPage, pageSize, totalItems]);

  const nextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, MIN_PAGE));
  }, []);

  const goToPage = useCallback(
    (page: number) => {
      const validPage = calculateValidPage(page, totalPages);
      setCurrentPage(validPage);
    },
    [totalPages]
  );

  const setPageSize = useCallback((size: number | "all") => {
    setPageSizeState(size);
    setCurrentPage(MIN_PAGE);
  }, []);

  return {
    currentPage,
    totalPages,
    currentItems: paginatedData.currentItems,
    totalItems,
    startIndex: paginatedData.startIndex,
    endIndex: paginatedData.endIndex,
    nextPage,
    prevPage,
    goToPage,
    setPageSize,
  };
}
