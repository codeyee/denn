import { ApiRequestError } from "@/lib/api/api";

const EFFECT_LABELS: Record<string, string> = {
  rating_archived: "archive your rating",
  review_archived: "archive your rating and review",
  favorite_removed: "remove this favorite",
};

export function getTrackingEffectDescription(error: unknown): string | null {
  if (
    !(error instanceof ApiRequestError) ||
    error.data.error !== "TRACKING_EFFECTS_REQUIRE_CONFIRMATION"
  ) {
    return null;
  }

  const effects = Array.isArray(error.data.effects)
    ? error.data.effects.filter(
        (effect): effect is string => typeof effect === "string",
      )
    : [];
  return effects.map((effect) => EFFECT_LABELS[effect] ?? effect).join(" and ");
}
