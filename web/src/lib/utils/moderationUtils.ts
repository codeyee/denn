import type { ModerationSummary } from "@/lib/types";

export function parseModerationSummary(value: unknown): ModerationSummary | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const summary = value as Record<string, unknown>;
  if (summary.status === "complete") {
    switch (summary.classification) {
      case "safe":
      case "explicit":
      case "needs_review":
        return { status: "complete", classification: summary.classification };
      default:
        return null;
    }
  }

  switch (summary.status) {
    case "missing":
    case "pending":
    case "stale":
    case "error":
      return summary.classification === null
        ? { status: summary.status, classification: null }
        : null;
    default:
      return null;
  }
}

export function shouldBlurModerationArtwork(
  summary: ModerationSummary | null | undefined,
  allowAdultContent = false,
): boolean {
  return (
    !allowAdultContent &&
    summary?.status === "complete" &&
    summary.classification === "explicit"
  );
}
