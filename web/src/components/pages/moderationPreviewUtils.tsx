import type { ModerationSummary } from "@/lib/types";

function getModerationLabel(summary: ModerationSummary | null): string {
  if (!summary) return "No valid summary · not a safety result";
  if (summary.status === "complete") {
    return `Complete · ${summary.classification.replaceAll("_", " ")}`;
  }

  switch (summary.status) {
    case "missing":
      return "Missing · no stored result";
    case "pending":
      return "Pending · no completed result";
    case "stale":
      return "Stale · do not rely on this result";
    case "error":
      return "Error · no valid result";
  }
}

export function ModerationBadge({
  source,
  summary,
}: {
  source: "Fixture" | "Core API";
  summary: ModerationSummary | null;
}) {
  return (
    <span className="rounded-full border border-white/40 bg-black/80 px-3 py-1 text-xs font-semibold text-white">
      {source} · {getModerationLabel(summary)}
    </span>
  );
}
