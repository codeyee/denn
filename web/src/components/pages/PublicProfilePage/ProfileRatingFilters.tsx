import type { ReactNode } from "react";

import { Input } from "@/components/common/ui/Input";
import { Select } from "@/components/common/ui/Select";
import type { ProfileSearchParams } from "@/lib/types";

interface ProfileRatingFiltersProps {
  search: ProfileSearchParams;
  onChange: (updates: Partial<ProfileSearchParams>) => void;
}

export function ProfileRatingFilters({
  search,
  onChange,
}: ProfileRatingFiltersProps) {
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <FilterSelect
        value={search.kind ?? "all"}
        label="Rating kind"
        onChange={(value) =>
          onChange({ kind: value as ProfileSearchParams["kind"] })
        }
      >
        <option value="all">Ratings and reviews</option>
        <option value="reviews">Reviews only</option>
        <option value="ratings_only">Ratings only</option>
      </FilterSelect>
      <FilterSelect
        value={
          search.favorite === undefined ? "all" : String(search.favorite)
        }
        label="Favorite"
        onChange={(value) =>
          onChange({
            favorite: value === "all" ? undefined : value === "true",
          })
        }
      >
        <option value="all">Any favorite state</option>
        <option value="true">Favorites only</option>
        <option value="false">Not favorites</option>
      </FilterSelect>
      <ScoreInput
        label="Minimum score"
        value={search.minScore}
        onChange={(value) => onChange({ minScore: value })}
      />
      <ScoreInput
        label="Maximum score"
        value={search.maxScore}
        onChange={(value) => onChange({ maxScore: value })}
      />
    </div>
  );
}

export function FilterSelect({
  value,
  label,
  onChange,
  children,
}: {
  value: string;
  label: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="text-xs font-medium text-white/55">
      <span className="sr-only">{label}</span>
      <Select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full border border-white/15 bg-black/40 px-3 text-sm text-white"
      >
        {children}
      </Select>
    </label>
  );
}

function ScoreInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: number;
  onChange: (value?: number) => void;
}) {
  return (
    <Input
      type="number"
      min={0.5}
      max={10}
      step={0.5}
      value={value ?? ""}
      aria-label={label}
      placeholder={label}
      className="min-h-11 border-white/15 bg-black/25 text-white"
      onChange={(event) =>
        onChange(event.target.value ? Number(event.target.value) : undefined)
      }
    />
  );
}
