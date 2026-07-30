import { Link } from "@tanstack/react-router";
import type { BrowseType } from "@/lib/types";

interface BrowsePaginationProps {
  type: BrowseType;
  page: number;
  totalPages: number;
  sort: "popular" | "recent";
  query: string;
}

export function BrowsePagination({
  type,
  page,
  totalPages,
  sort,
  query,
}: BrowsePaginationProps) {
  if (totalPages <= 1) return null;

  const previousPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);
  return (
    <nav aria-label="Browse pagination" className="mt-8 flex items-center justify-between gap-4">
      <PageLink type={type} page={previousPage} sort={sort} query={query} disabled={page <= 1}>
        Previous
      </PageLink>
      <span className="text-sm text-white/65" aria-live="polite">
        Page {page} of {totalPages}
      </span>
      <PageLink type={type} page={nextPage} sort={sort} query={query} disabled={page >= totalPages}>
        Next
      </PageLink>
    </nav>
  );
}

function PageLink({
  type,
  page,
  sort,
  query,
  disabled,
  children,
}: Pick<BrowsePaginationProps, "type" | "page" | "sort" | "query"> & {
  disabled: boolean;
  children: string;
}) {
  if (disabled) {
    return (
      <span className="inline-flex min-h-11 items-center rounded-md border border-white/10 px-4 text-sm text-white/30">
        {children}
      </span>
    );
  }
  return (
    <Link
      to="/browse/$type"
      params={{ type }}
      search={{ page, sort, q: query || undefined }}
      className="inline-flex min-h-11 items-center rounded-md border border-white/25 px-4 text-sm text-white transition-colors hover:border-white/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      {children}
    </Link>
  );
}
