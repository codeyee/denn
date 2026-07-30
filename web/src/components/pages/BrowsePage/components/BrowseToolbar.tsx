import { useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/common/ui/Button";
import { SearchInput } from "@/components/common/ui/SearchInput";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { CONTENT_TYPE_DEFINITIONS } from "@/lib/contentTypes";
import { ContentType, type BrowseType } from "@/lib/types";

interface BrowseToolbarProps {
  type: BrowseType;
  page: number;
  sort: "popular" | "recent";
  query: string;
}

export function BrowseToolbar({
  type,
  page,
  sort,
  query,
}: BrowseToolbarProps) {
  const navigate = useNavigate({ from: "/browse/$type" });
  const definition = CONTENT_TYPE_DEFINITIONS[definitionType(type)];

  const updateSearch = useCallback((normalized: string) => {
    if (normalized === query) return;

    void navigate({
      to: "/browse/$type",
      params: { type },
      search: {
        page: 1,
        sort: normalized ? undefined : sort,
        q: normalized || undefined,
      },
      replace: true,
    });
  }, [navigate, query, sort, type]);

  const {
    value,
    isDebouncing,
    onChange,
    commit,
    clear,
  } = useDebouncedSearch({
    initialValue: query,
    onDebouncedChange: updateSearch,
  });

  return (
    <div className="mt-6 flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-4 md:flex-row md:items-end md:justify-between">
      <form
        className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          commit(value);
        }}
      >
        <div className="min-w-0 flex-1">
          <SearchInput
            id="browse-q"
            value={value}
            onChange={onChange}
            onClear={clear}
            label={`Search ${definition.pluralLabel.toLowerCase()}`}
            labelClassName="mb-2 block text-sm text-white/70 not-sr-only"
            placeholder={`Search ${definition.pluralLabel.toLowerCase()}`}
            containerClassName="min-w-0"
          />
        </div>
        <Button type="submit" variant="secondary" className="min-h-11 sm:min-w-24">
          Search
        </Button>
      </form>

      {isDebouncing ? (
        <p className="text-sm text-white/60" role="status" aria-live="polite">
          Searching automatically…
        </p>
      ) : null}

      {!query ? (
        <div className="flex flex-wrap gap-2" aria-label="Browse sort">
          <SortLink type={type} page={page} selected={sort === "popular"} value="popular">
            Popular
          </SortLink>
          <SortLink type={type} page={page} selected={sort === "recent"} value="recent">
            Recent
          </SortLink>
        </div>
      ) : (
        <p className="max-w-xs text-sm text-white/60" role="status">
          Search results are ordered by relevance.
        </p>
      )}
    </div>
  );
}

function SortLink({
  type,
  page,
  selected,
  value,
  children,
}: {
  type: BrowseType;
  page: number;
  selected: boolean;
  value: "popular" | "recent";
  children: string;
}) {
  const navigate = useNavigate({ from: "/browse/$type" });
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`min-h-11 rounded-md border px-4 text-sm transition-colors motion-reduce:transition-none ${selected ? "border-white bg-white text-black" : "border-white/20 bg-black/20 text-white/75 hover:border-white/50 hover:text-white"}`}
      onClick={() => {
        void navigate({
          to: "/browse/$type",
          params: { type },
          search: { page, sort: value, q: undefined },
        });
      }}
    >
      {children}
    </button>
  );
}

function definitionType(type: BrowseType) {
  switch (type) {
    case "movies": return ContentType.MOVIE;
    case "tv-shows": return ContentType.TV_SHOW;
    case "games": return ContentType.GAME;
    case "music": return ContentType.ALBUM;
    case "books": return ContentType.BOOK;
  }
}
