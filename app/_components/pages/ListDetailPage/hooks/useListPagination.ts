import { useState, useCallback } from "react";

interface UseListPaginationReturn {
  currentPage: number;
  groupPages: Record<string, number>;
  subGroupPages: Record<string, number>;
  setCurrentPage: (page: number) => void;
  setGroupPages: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setSubGroupPages: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  resetPagination: () => void;
}

export function useListPagination(
  initialPage: number = 1
): UseListPaginationReturn {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [groupPages, setGroupPages] = useState<Record<string, number>>({});
  const [subGroupPages, setSubGroupPages] = useState<Record<string, number>>({});

  const resetPagination = useCallback(() => {
    setCurrentPage(1);
    setGroupPages({});
    setSubGroupPages({});
  }, []);

  return {
    currentPage,
    groupPages,
    subGroupPages,
    setCurrentPage,
    setGroupPages,
    setSubGroupPages,
    resetPagination,
  };
}
