import { useEffect, useState, type FormEvent } from "react";
import { Search, X } from "lucide-react";

import { Button } from "@/components/common/ui/Button";
import { Input } from "@/components/common/ui/Input";
import type { ProfileSearchParams } from "@/lib/types";
import { FilterSelect } from "./ProfileRatingFilters";
import { ProfileProgressToolbar } from "./ProfileProgressToolbar";

interface ProfileFiltersProps {
  search: ProfileSearchParams;
  onChange: (updates: Partial<ProfileSearchParams>) => void;
}

export function ProfileFilters({ search, onChange }: ProfileFiltersProps) {
  if (search.tab === "progress") {
    return <ProfileProgressToolbar search={search} onChange={onChange} />;
  }
  return <ListProfileFilters search={search} onChange={onChange} />;
}

function ListProfileFilters({ search, onChange }: ProfileFiltersProps) {
  const [query, setQuery] = useState(search.q ?? "");
  useEffect(() => setQuery(search.q ?? ""), [search.q]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onChange({ q: query.trim() || undefined });
  }

  return (
    <form
      onSubmit={submit}
      className="mb-7 rounded-xl bg-list-item-background p-4"
      aria-label="Filter profile activity"
    >
      <div className="grid gap-3 md:grid-cols-[minmax(14rem,1fr)_repeat(2,minmax(10rem,auto))]">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${search.tab}`}
            aria-label={`Search ${search.tab}`}
            className="min-h-11 border-white/15 bg-black/25 text-white"
          />
          <Button type="submit" size="icon" variant="secondary" aria-label="Search">
            <Search aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
        {search.tab === "lists" ? (
          <FilterSelect
            value={search.role ?? "all"}
            label="List role"
            onChange={(value) =>
              onChange({ role: value as ProfileSearchParams["role"] })
            }
          >
            <option value="all">All roles</option>
            <option value="owner">Owner</option>
            <option value="member">Member</option>
          </FilterSelect>
        ) : null}
        <SortSelect search={search} onChange={onChange} />
      </div>
      <div className="mt-3 flex justify-end">
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
              role: undefined,
            });
          }}
        >
          <X aria-hidden="true" className="h-4 w-4" />
          Clear filters
        </Button>
      </div>
    </form>
  );
}

function SortSelect({
  search,
  onChange,
}: ProfileFiltersProps) {
  const options =
    search.tab === "progress"
      ? [
          ["recent", "Recently updated"],
          ["oldest", "Oldest update"],
          ["title", "Title A–Z"],
          ["-score", "Highest rated"],
        ]
      : [
            ["updated", "Recently updated"],
            ["created", "Recently created"],
            ["name", "Name A–Z"],
          ];

  return (
    <FilterSelect
      value={search.sort ?? options[0][0]}
      label="Sort order"
      onChange={(value) => onChange({ sort: value })}
    >
      {options.map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </FilterSelect>
  );
}
