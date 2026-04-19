import { List as ListIcon, Grid } from "lucide-react";

interface ViewModeToggleProps {
  viewMode: "list" | "gallery";
  onViewModeChange: (mode: "list" | "gallery") => void;
  disabled?: boolean;
}

export function ViewModeToggle({
  viewMode,
  onViewModeChange,
  disabled = false,
}: ViewModeToggleProps) {
  return (
    <div className="flex gap-1 bg-white/5 rounded-lg p-1">
      <button
        onClick={() => onViewModeChange("list")}
        className={`p-2 rounded transition-colors cursor-pointer ${
          viewMode === "list"
            ? "bg-white/10 text-white"
            : "text-white/60 hover:text-white"
        }`}
        title="List view"
        disabled={disabled}
        aria-label="Switch to list view"
      >
        <ListIcon className="w-4 h-4" />
      </button>
      <button
        onClick={() => onViewModeChange("gallery")}
        className={`p-2 rounded transition-colors cursor-pointer ${
          viewMode === "gallery"
            ? "bg-white/10 text-white"
            : "text-white/60 hover:text-white"
        }`}
        title="Gallery view"
        disabled={disabled}
        aria-label="Switch to gallery view"
      >
        <Grid className="w-4 h-4" />
      </button>
    </div>
  );
}
