import {
  Ban,
  Bookmark,
  CheckCircle2,
  Grid2X2,
  Layers3,
  List,
  PauseCircle,
  PlayCircle,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import {
  CONTENT_TYPE_DEFINITIONS,
  DISCOVERY_CONTENT_TYPES,
} from "@/lib/contentTypes";
import {
  ContentType,
  type ProfileSearchParams,
  type TrackingStatus,
} from "@/lib/types";

interface ProgressToolbarControlProps {
  search: ProfileSearchParams;
  onChange: (updates: Partial<ProfileSearchParams>) => void;
}

const STATUS_OPTIONS: Array<{
  value: TrackingStatus;
  label: string;
  icon: LucideIcon;
}> = [
  { value: "backlog", label: "Planned", icon: Bookmark },
  { value: "in_progress", label: "In progress", icon: PlayCircle },
  { value: "on_hold", label: "On hold", icon: PauseCircle },
  { value: "dropped", label: "Dropped", icon: Ban },
  { value: "completed", label: "Completed", icon: CheckCircle2 },
];

export function ProgressStatusFilters({
  search,
  onChange,
}: ProgressToolbarControlProps) {
  const selected = search.status ?? [];

  return (
    <FilterChipGroup label="Status">
      <FilterChip
        label="All statuses"
        icon={Layers3}
        active={selected.length === 0}
        onClick={() => onChange({ status: undefined })}
      />
      {STATUS_OPTIONS.map((option) => (
        <FilterChip
          key={option.value}
          label={option.label}
          icon={option.icon}
          active={selected.includes(option.value)}
          onClick={() =>
            onChange({ status: toggleSelection(selected, option.value) })
          }
        />
      ))}
    </FilterChipGroup>
  );
}

export function ProgressTypeFilters({
  search,
  onChange,
}: ProgressToolbarControlProps) {
  const selected = search.type ?? [];

  return (
    <FilterChipGroup label="Content type">
      <FilterChip
        label="All types"
        icon={Layers3}
        active={selected.length === 0}
        onClick={() => onChange({ type: undefined, tvKind: undefined })}
      />
      {DISCOVERY_CONTENT_TYPES.map((type) => {
        const definition = CONTENT_TYPE_DEFINITIONS[type];
        return (
          <FilterChip
            key={type}
            label={definition.pluralLabel}
            icon={definition.icon}
            active={selected.includes(type)}
            onClick={() => {
              const nextTypes = toggleSelection(selected, type);
              onChange({
                type: nextTypes,
                tvKind: nextTypes?.includes(ContentType.TV_SHOW)
                  ? search.tvKind
                  : undefined,
              });
            }}
          />
        );
      })}
    </FilterChipGroup>
  );
}

export function ProgressViewToggle({
  search,
  onChange,
}: ProgressToolbarControlProps) {
  const view = search.view ?? "grid";
  return (
    <div
      role="group"
      aria-label="Progress view"
      className="flex min-h-11 rounded-md bg-black/30 p-1"
    >
      {[
        { value: "grid", label: "Grid", icon: Grid2X2 },
        { value: "list", label: "List", icon: List },
      ].map((option) => {
        const Icon = option.icon;
        const active = view === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() =>
              onChange({ view: option.value as ProfileSearchParams["view"] })
            }
            className={
              active
                ? "inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-sm bg-white px-3 text-sm font-semibold text-black"
                : "inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-sm px-3 text-sm font-medium text-white/65 transition-colors hover:text-white focus-visible:ring-4 focus-visible:ring-white/70 motion-reduce:transition-none"
            }
          >
            <Icon aria-hidden="true" className="size-4" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function FilterChipGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <span className="text-xs font-semibold text-white/55">{label}</span>
      <div role="group" aria-label={label} className="flex flex-wrap gap-2">
        {children}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-black/20 px-3.5 text-sm font-medium text-white/75 outline-none transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white focus-visible:ring-4 focus-visible:ring-white/70 motion-reduce:transition-none aria-pressed:border-white aria-pressed:bg-white aria-pressed:font-semibold aria-pressed:text-black"
    >
      <Icon aria-hidden="true" className="size-4" />
      {label}
    </button>
  );
}

function toggleSelection<T>(selected: T[], value: T): T[] | undefined {
  const next = selected.includes(value)
    ? selected.filter((item) => item !== value)
    : [...selected, value];
  return next.length > 0 ? next : undefined;
}
