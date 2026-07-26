import { useEffect, useState, type FormEvent } from "react";
import { Search, X } from "lucide-react";

import { Button } from "@/components/common/ui/Button";
import { Input } from "@/components/common/ui/Input";
import { ContentType, type ProfileSearchParams } from "@/lib/types";
import { getContentTypeDisplayName } from "@/lib/utils/contentTypeUtils";
import { FilterSelect, ProfileRatingFilters } from "./ProfileRatingFilters";

interface ProfileFiltersProps {
  search: ProfileSearchParams;
  onChange: (updates: Partial<ProfileSearchParams>) => void;
}

const CONTENT_TYPES = [
  ContentType.MOVIE,
  ContentType.TV_SHOW,
  ContentType.GAME,
  ContentType.ALBUM,
  ContentType.BOOK,
] as const;

export function ProfileFilters({ search, onChange }: ProfileFiltersProps) {
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
        {search.tab !== "lists" ? (
          <FilterSelect
            value={search.type ?? ""}
            label="Content type"
            onChange={(value) =>
              onChange({
                type: (value as ProfileSearchParams["type"]) || undefined,
              })
            }
          >
            <option value="">All types</option>
            {CONTENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {getContentTypeDisplayName(type)}
              </option>
            ))}
          </FilterSelect>
        ) : (
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
        )}
        <SortSelect search={search} onChange={onChange} />
      </div>
      {search.tab === "ratings" ? (
        <ProfileRatingFilters search={search} onChange={onChange} />
      ) : null}
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
              kind: undefined,
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
    search.tab === "completed"
      ? [
          ["date_desc", "Recently completed"],
          ["date_asc", "Oldest completed"],
          ["title", "Title A–Z"],
          ["-score", "Highest rated"],
        ]
      : search.tab === "ratings"
        ? [
            ["recent", "Most recent"],
            ["oldest", "Oldest"],
            ["title", "Title A–Z"],
            ["-score", "Highest score"],
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
