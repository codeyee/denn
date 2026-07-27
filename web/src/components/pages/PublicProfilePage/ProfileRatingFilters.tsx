import type { ReactNode } from "react";
import {
  CircleDot,
  GalleryVerticalEnd,
  Heart,
  HeartOff,
  Layers3,
  MessageCircle,
  MessageCircleOff,
  Star,
  StarOff,
  Tv,
} from "lucide-react";

import { Input } from "@/components/common/ui/Input";
import { Select } from "@/components/common/ui/Select";
import { ContentType, type ProfileSearchParams } from "@/lib/types";
import {
  ProfileFilterMenu,
  type ProfileFilterOption,
} from "./ProfileFilterMenu";

interface ProfileProgressFiltersProps {
  search: ProfileSearchParams;
  onChange: (updates: Partial<ProfileSearchParams>) => void;
}

export function ProfileAdvancedFilters({
  search,
  onChange,
}: ProfileProgressFiltersProps) {
  return (
    <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2 lg:grid-cols-4">
      <ProfileFilterMenu
        value={
          search.rated === undefined
            ? "all"
            : search.rated
              ? "true"
              : "false"
        }
        label="Rating"
        showLabel
        options={RATING_OPTIONS}
        onChange={(value) =>
          onChange({
            rated: value === "all" ? undefined : value === "true",
          })
        }
      />
      <ProfileFilterMenu
        value={
          search.reviewed === undefined
            ? "all"
            : search.reviewed
              ? "true"
              : "false"
        }
        label="Review"
        showLabel
        options={REVIEW_OPTIONS}
        onChange={(value) =>
          onChange({
            reviewed: value === "all" ? undefined : value === "true",
          })
        }
      />
      <ProfileFilterMenu
        value={
          search.favorite === undefined
            ? "all"
            : search.favorite
              ? "true"
              : "false"
        }
        label="Favorite"
        showLabel
        options={FAVORITE_OPTIONS}
        onChange={(value) =>
          onChange({
            favorite: value === "all" ? undefined : value === "true",
          })
        }
      />
      {search.type?.includes(ContentType.TV_SHOW) ? (
        <ProfileFilterMenu
          value={search.tvKind ?? "all"}
          label="Series scope"
          showLabel
          options={TV_SCOPE_OPTIONS}
          onChange={(value) =>
            onChange({ tvKind: value as ProfileSearchParams["tvKind"] })
          }
        />
      ) : null}
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

type BooleanFilterValue = "all" | "true" | "false";

const RATING_OPTIONS: readonly ProfileFilterOption<BooleanFilterValue>[] = [
  { value: "all", label: "Any rating state", icon: CircleDot },
  { value: "true", label: "Rated only", icon: Star },
  { value: "false", label: "Not rated", icon: StarOff },
];

const REVIEW_OPTIONS: readonly ProfileFilterOption<BooleanFilterValue>[] = [
  { value: "all", label: "Any review state", icon: CircleDot },
  { value: "true", label: "Reviewed only", icon: MessageCircle },
  { value: "false", label: "No review", icon: MessageCircleOff },
];

const FAVORITE_OPTIONS: readonly ProfileFilterOption<BooleanFilterValue>[] = [
  { value: "all", label: "Any favorite state", icon: CircleDot },
  { value: "true", label: "Favorites only", icon: Heart },
  { value: "false", label: "Not favorites", icon: HeartOff },
];

const TV_SCOPE_OPTIONS: readonly ProfileFilterOption<
  NonNullable<ProfileSearchParams["tvKind"]>
>[] = [
  { value: "all", label: "Series and seasons", icon: Layers3 },
  { value: "series", label: "Series only", icon: Tv },
  { value: "seasons", label: "Seasons only", icon: GalleryVerticalEnd },
];

export function FilterSelect({
  value,
  label,
  onChange,
  children,
  className,
  showLabel = false,
}: {
  value: string;
  label: string;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
  showLabel?: boolean;
}) {
  return (
    <label className={`text-xs font-medium text-white/65 ${className ?? ""}`}>
      <span className={showLabel ? "mb-1.5 block" : "sr-only"}>{label}</span>
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
    <label className="text-xs font-medium text-white/65">
      <span className="mb-1.5 block">{label}</span>
      <Input
        type="number"
        min={0.5}
        max={10}
        step={0.5}
        value={value ?? ""}
        aria-label={label}
        placeholder="Any score"
        className="min-h-11 border-white/15 bg-black/25 text-white"
        onChange={(event) =>
          onChange(event.target.value ? Number(event.target.value) : undefined)
        }
      />
    </label>
  );
}
