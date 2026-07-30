import type { GameDuration } from "@/lib/types";

export const MAX_GAME_DURATION_HOURS = 3000;

const MAX_GAME_DURATION_SECONDS = MAX_GAME_DURATION_HOURS * 60 * 60;

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
    ["Rushed", duration.hastily_seconds],
    ["Normal", duration.normally_seconds],
    ["Complete", duration.completely_seconds],
  ];

  const usableValues = values.flatMap(([label, seconds]) => (
    typeof seconds === "number" && Number.isFinite(seconds) && seconds > 0 && seconds <= MAX_GAME_DURATION_SECONDS
      ? [{ label, seconds }]
      : []
  ));

  for (let index = 1; index < usableValues.length; index += 1) {
    if (usableValues[index].seconds < usableValues[index - 1].seconds) {
      return usableValues
        .filter(({ label }) => label === "Normal")
        .map(({ label, seconds }) => ({
          label,
          value: formatGameDuration(seconds),
        }));
    }
  }

  return usableValues.map(({ label, seconds }) => ({
    label,
    value: formatGameDuration(seconds),
  }));
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
