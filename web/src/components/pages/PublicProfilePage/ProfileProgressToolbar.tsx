import { useEffect, useState, type FormEvent } from "react";
import {
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { Button } from "@/components/common/ui/Button";
import { Input } from "@/components/common/ui/Input";
import type { ProfileSearchParams } from "@/lib/types";
import { ProfileAdvancedFilters } from "./ProfileRatingFilters";
import { ProgressSortControl } from "./ProgressSortControl";
import {
  ProgressStatusFilters,
  ProgressTypeFilters,
  ProgressViewToggle,
} from "./ProgressToolbarControls";

interface ProfileProgressToolbarProps {
  search: ProfileSearchParams;
  onChange: (updates: Partial<ProfileSearchParams>) => void;
}

export function ProfileProgressToolbar({
  search,
  onChange,
}: ProfileProgressToolbarProps) {
  const [query, setQuery] = useState(search.q ?? "");
  const advancedCount = countAdvancedFilters(search);
  const [showAdvanced, setShowAdvanced] = useState(advancedCount > 0);

  useEffect(() => setQuery(search.q ?? ""), [search.q]);
  useEffect(() => {
    if (advancedCount > 0) setShowAdvanced(true);
  }, [advancedCount]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onChange({ q: query.trim() || undefined });
  }

  return (
    <form
      onSubmit={submit}
      className="mb-7 rounded-xl bg-list-item-background p-4 md:p-5"
      aria-label="Filter profile progress"
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(18rem,1fr)_minmax(18rem,auto)_auto]">
        <div className="flex min-w-0 gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/55"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search titles"
              aria-label="Search progress"
              className="min-h-11 border-white/15 bg-black/25 pl-10 text-white"
            />
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </div>
        <ProgressSortControl search={search} onChange={onChange} />
        <ProgressViewToggle search={search} onChange={onChange} />
      </div>

      <div className="mt-5 grid gap-4 border-t border-white/10 pt-4">
        <ProgressTypeFilters search={search} onChange={onChange} />
        <ProgressStatusFilters search={search} onChange={onChange} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
        <Button
          type="button"
          variant="ghost"
          aria-expanded={showAdvanced}
          aria-controls="profile-advanced-filters"
          onClick={() => setShowAdvanced((current) => !current)}
        >
          <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
          More filters
          {advancedCount > 0 ? (
            <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-black">
              {advancedCount}
            </span>
          ) : null}
        </Button>
        {hasFilters(search) ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setQuery("");
              onChange({
                q: undefined,
                type: undefined,
                sort: undefined,
                order: undefined,
                status: undefined,
                tvKind: undefined,
                rated: undefined,
                reviewed: undefined,
                favorite: undefined,
                minScore: undefined,
                maxScore: undefined,
              });
            }}
          >
            <X aria-hidden="true" className="h-4 w-4" />
            Clear filters
          </Button>
        ) : null}
      </div>

      <div id="profile-advanced-filters" hidden={!showAdvanced}>
        <ProfileAdvancedFilters search={search} onChange={onChange} />
      </div>
    </form>
  );
}

function countAdvancedFilters(search: ProfileSearchParams) {
  return [
    search.tvKind && search.tvKind !== "all",
    search.rated !== undefined,
    search.reviewed !== undefined,
    search.favorite !== undefined,
    search.minScore !== undefined,
    search.maxScore !== undefined,
  ].filter(Boolean).length;
}

function hasFilters(search: ProfileSearchParams) {
  return Boolean(
    search.q ||
      search.type?.length ||
      search.status?.length ||
      search.sort ||
      search.order ||
      countAdvancedFilters(search),
  );
}
