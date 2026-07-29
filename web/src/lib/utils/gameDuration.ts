import type { GameDuration } from "@/lib/types";

export interface GameDurationRow {
  label: string;
  value: string;
}

export function getGameDurationRows(
  duration: GameDuration | null | undefined,
): GameDurationRow[] {
  if (!duration || duration.status === "error" || duration.status === "no_data") {
    return [];
  }

  const values: Array<[string, number | undefined]> = [
    ["Main Story", duration.main_story_seconds],
    ["Main + Extras", duration.main_extra_seconds],
    ["Completionist", duration.completionist_seconds],
  ];

  return values.flatMap(([label, seconds]) => (
    typeof seconds === "number" && seconds > 0
      ? [{ label, value: formatGameDuration(seconds) }]
      : []
  ));
}

export function formatGameDuration(seconds: number): string {
  const hours = seconds / 3600;
  if (hours < 1) {
    return `${Math.max(1, Math.round(seconds / 60))} min`;
  }
  if (hours < 10) {
    return `${hours.toFixed(1).replace(/\.0$/, "")} h`;
  }
  return `${Math.round(hours)} h`;
}
