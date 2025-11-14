"use client";

import * as React from "react";
import {
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/app/_components/lib/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/app/_components/common/Dropdown";
import { cn } from "@/lib/utils";
import type { GroupBy, SortBy, SortOrder, PageSize } from "@/types/listView";

interface ListControlsProps {
  // Grouping
  primaryGroup: GroupBy;
  secondaryGroup: GroupBy;
  onPrimaryGroupChange: (group: GroupBy) => void;
  onSecondaryGroupChange: (group: GroupBy) => void;

  // Sorting
  sortBy: SortBy;
  sortOrder: SortOrder;
  onSortByChange: (sortBy: SortBy) => void;
  onSortOrderChange: (order: SortOrder) => void;

  // Pagination
  currentPage: number;
  pageSize: PageSize;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSize) => void;

  // State
  disabled?: boolean;
}

const groupByOptions: { value: GroupBy; label: string }[] = [
  { value: "none", label: "No Grouping" },
  { value: "status", label: "Status" },
  { value: "content_type", label: "Content Type" },
  { value: "date_added", label: "Date Added" },
  { value: "rating", label: "Rating" },
];

const sortByOptions: { value: SortBy; label: string }[] = [
  { value: "list_order", label: "Default Order" },
  { value: "added_at", label: "Date Added" },
  { value: "name", label: "Name" },
  { value: "completed_at", label: "Completed Date" },
  { value: "list_rating", label: "Rating" },
  { value: "added_by", label: "Added By" },
  { value: "content_type", label: "Type" },
];

const pageSizeOptions: PageSize[] = [10, 20, 50];

export function ListControls({
  primaryGroup,
  secondaryGroup,
  onPrimaryGroupChange,
  onSecondaryGroupChange,
  sortBy,
  sortOrder,
  onSortByChange,
  onSortOrderChange,
  currentPage,
  pageSize,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  onPageChange,
  onPageSizeChange,
  disabled = false,
}: ListControlsProps) {
  const primaryGroupLabel =
    groupByOptions.find((opt) => opt.value === primaryGroup)?.label ||
    "No Grouping";
  const secondaryGroupLabel =
    groupByOptions.find((opt) => opt.value === secondaryGroup)?.label ||
    "No Grouping";
  const sortByLabel =
    sortByOptions.find((opt) => opt.value === sortBy)?.label || "Default Order";

  // Filter secondary group options (exclude primary group)
  const secondaryGroupOptions = groupByOptions.filter(
    (opt) => opt.value === "none" || opt.value !== primaryGroup
  );

  return (
    <div className="space-y-4">
      {/* Grouping Section */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground/80">Grouping</h3>
        <div className="space-y-2">
          {/* Primary Group */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Primary
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  className="w-full justify-between cursor-pointer bg-white/5 hover:bg-white/10 text-white border-white/20"
                >
                  <span className="truncate">{primaryGroupLabel}</span>
                  <ChevronDown className="size-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[200px]">
                {groupByOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => onPrimaryGroupChange(option.value)}
                    className={cn(
                      "cursor-pointer",
                      primaryGroup === option.value &&
                        "bg-accent text-accent-foreground"
                    )}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Secondary Group - Only show if primary is not "none" */}
          {primaryGroup !== "none" && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Secondary (optional)
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    className="w-full justify-between cursor-pointer bg-white/5 hover:bg-white/10 text-white border-white/20"
                  >
                    <span className="truncate">{secondaryGroupLabel}</span>
                    <ChevronDown className="size-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[200px]">
                  {secondaryGroupOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => onSecondaryGroupChange(option.value)}
                      className={cn(
                        "cursor-pointer",
                        secondaryGroup === option.value &&
                          "bg-accent text-accent-foreground"
                      )}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      {/* Sorting Section */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground/80">Sorting</h3>
        <div className="space-y-2">
          {/* Sort By */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Sort by
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  className="w-full justify-between cursor-pointer bg-white/5 hover:bg-white/10 text-white border-white/20"
                >
                  <span className="truncate">{sortByLabel}</span>
                  <ChevronDown className="size-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[200px]">
                {sortByOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => onSortByChange(option.value)}
                    className={cn(
                      "cursor-pointer",
                      sortBy === option.value &&
                        "bg-accent text-accent-foreground"
                    )}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Sort Order */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Order
            </label>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() =>
                onSortOrderChange(sortOrder === "asc" ? "desc" : "asc")
              }
              className="w-full justify-between cursor-pointer bg-white/5 hover:bg-white/10 text-white border-white/20"
            >
              <span>{sortOrder === "asc" ? "Ascending" : "Descending"}</span>
              {sortOrder === "asc" ? (
                <ArrowUp className="size-4" />
              ) : (
                <ArrowDown className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Pagination Section */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground/80">Pagination</h3>
        <div className="space-y-2">
          {/* Page Size */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Items per page
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  className="w-full justify-between cursor-pointer bg-white/5 hover:bg-white/10 text-white border-white/20"
                >
                  <span>{pageSize} items</span>
                  <ChevronDown className="size-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[200px]">
                {pageSizeOptions.map((size) => (
                  <DropdownMenuItem
                    key={size}
                    onClick={() => onPageSizeChange(size)}
                    className={cn(
                      "cursor-pointer",
                      pageSize === size && "bg-accent text-accent-foreground"
                    )}
                  >
                    {size} items
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Page Info */}
          <div className="text-xs text-muted-foreground text-center py-2">
            Showing {startIndex + 1}-{endIndex} of {totalItems}
          </div>

          {/* Page Navigation */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={disabled || currentPage === 1}
              onClick={() => onPageChange(1)}
              title="First page"
              className="cursor-pointer bg-white/5 hover:bg-white/10 text-white border-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={disabled || currentPage === 1}
              onClick={() => onPageChange(currentPage - 1)}
              title="Previous page"
              className="cursor-pointer bg-white/5 hover:bg-white/10 text-white border-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <div className="flex-1 text-center text-sm">
              <span className="font-medium text-white">{currentPage}</span>
              <span className="text-muted-foreground"> / {totalPages}</span>
            </div>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={disabled || currentPage === totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              title="Next page"
              className="cursor-pointer bg-white/5 hover:bg-white/10 text-white border-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={disabled || currentPage === totalPages}
              onClick={() => onPageChange(totalPages)}
              title="Last page"
              className="cursor-pointer bg-white/5 hover:bg-white/10 text-white border-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}