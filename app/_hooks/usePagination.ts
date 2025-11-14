import { useState, useMemo, useCallback } from "react";

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

export function usePagination<T>({
  items,
  pageSize: initialPageSize,
  initialPage = 1,
}: UsePaginationOptions<T>): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState<number | "all">(initialPageSize);

  const totalItems = items.length;

  const totalPages = useMemo(() => {
    if (pageSize === "all" || totalItems === 0) return 1;
    return Math.ceil(totalItems / pageSize);
  }, [totalItems, pageSize]);

  const paginatedData = useMemo(() => {
    if (pageSize === "all") {
      return {
        currentItems: items,
        startIndex: 0,
        endIndex: totalItems,
      };
    }

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
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
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  }, []);

  const goToPage = useCallback((page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  }, [totalPages]);

  const setPageSize = useCallback((size: number | "all") => {
    setPageSizeState(size);
    setCurrentPage(1);
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
