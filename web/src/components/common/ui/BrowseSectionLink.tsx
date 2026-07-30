import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

import type { BrowseType } from "@/lib/types";

interface BrowseSectionLinkProps {
  type: BrowseType;
  label: string;
  query?: string;
}

export function BrowseSectionLink({
  type,
  label,
  query,
}: BrowseSectionLinkProps) {
  const hasQuery = Boolean(query?.trim());

  return (
    <Link
      to="/browse/$type"
      params={{ type }}
      search={{
        page: 1,
        sort: hasQuery ? undefined : "popular",
        q: hasQuery ? query : undefined,
      }}
      aria-label={`View all ${label.toLowerCase()}`}
      className="group inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md border border-white/25 bg-white/[0.06] px-0 text-xs font-semibold text-white transition-colors hover:border-white/50 hover:bg-white/[0.12] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none sm:gap-2 sm:px-3 sm:text-sm"
    >
      <span className="sm:hidden">View all</span>
      <span className="hidden sm:inline">View all {label}</span>
      <ArrowRight
        aria-hidden="true"
        className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
      />
    </Link>
  );
}
