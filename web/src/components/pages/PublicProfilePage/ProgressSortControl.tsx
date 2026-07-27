import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock3,
  Star,
  TextInitial,
} from "lucide-react";

import { Button } from "@/components/common/ui/Button";
import type { ProfileSearchParams } from "@/lib/types";
import {
  ProfileFilterMenu,
  type ProfileFilterOption,
} from "./ProfileFilterMenu";

type ProgressSort = "updated" | "title" | "score" | "completed";
type SortOrder = "asc" | "desc";

const SORT_OPTIONS: readonly ProfileFilterOption<ProgressSort>[] = [
  { value: "updated", label: "Last updated", icon: Clock3 },
  { value: "completed", label: "Completion date", icon: CheckCircle2 },
  { value: "title", label: "Title", icon: TextInitial },
  { value: "score", label: "Rating", icon: Star },
];

export function ProgressSortControl({
  search,
  onChange,
}: {
  search: ProfileSearchParams;
  onChange: (updates: Partial<ProfileSearchParams>) => void;
}) {
  const { sort, order } = resolveProgressSort(search);
  const directionLabel = getDirectionLabel(sort, order);
  const DirectionIcon = order === "desc" ? ArrowDown : ArrowUp;

  return (
    <div className="grid grid-cols-[minmax(10rem,1fr)_auto] gap-2">
      <ProfileFilterMenu
        value={sort}
        label="Sort criterion"
        options={SORT_OPTIONS}
        onChange={(value) =>
          onChange({ sort: value, order: defaultOrder(value) })
        }
      />
      <Button
        type="button"
        variant="secondary"
        className="min-w-11 px-3"
        aria-label={`Sort direction: ${directionLabel}`}
        title={directionLabel}
        onClick={() =>
          onChange({
            sort,
            order: order === "desc" ? "asc" : "desc",
          })
        }
      >
        <DirectionIcon aria-hidden="true" className="size-4" />
        <span className="hidden xl:inline">{directionLabel}</span>
      </Button>
    </div>
  );
}

export function resolveProgressSort(search: ProfileSearchParams): {
  sort: ProgressSort;
  order: SortOrder;
} {
  const legacy = {
    recent: { sort: "updated", order: "desc" },
    oldest: { sort: "updated", order: "asc" },
    "-title": { sort: "title", order: "desc" },
    "-score": { sort: "score", order: "desc" },
  } as const;
  if (search.sort && search.sort in legacy) {
    return legacy[search.sort as keyof typeof legacy];
  }
  const sort = SORT_OPTIONS.some((option) => option.value === search.sort)
    ? (search.sort as ProgressSort)
    : "updated";
  return {
    sort,
    order: search.order ?? defaultOrder(sort),
  };
}

function defaultOrder(sort: ProgressSort): SortOrder {
  return sort === "title" ? "asc" : "desc";
}

function getDirectionLabel(sort: ProgressSort, order: SortOrder) {
  if (sort === "title") return order === "asc" ? "A–Z" : "Z–A";
  if (sort === "score") return order === "desc" ? "Highest first" : "Lowest first";
  return order === "desc" ? "Newest first" : "Oldest first";
}
