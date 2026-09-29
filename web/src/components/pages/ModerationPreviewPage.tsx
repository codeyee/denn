import artworkUrl from "@/assets/moderation-preview-artwork.svg";
import { ContentCard } from "@/components/common/cards/ContentCard";
import type { Content, ModerationSummary } from "@/lib/types";
import { ModerationCoreItemLookup } from "./ModerationCoreItemLookup";
import { ModerationBadge } from "./moderationPreviewUtils";

const fixtures: Array<{ id: string; title: string; summary: ModerationSummary }> = [
  {
    id: "fixture-explicit",
    title: "The Painted Garden",
    summary: { status: "complete", classification: "explicit" },
  },
  {
    id: "fixture-needs-review",
    title: "The Quiet Observatory",
    summary: { status: "complete", classification: "needs_review" },
  },
  {
    id: "fixture-stale",
    title: "A Map of Tomorrow",
    summary: { status: "stale", classification: null },
  },
  {
    id: "fixture-missing",
    title: "The Last Lantern",
    summary: { status: "missing", classification: null },
  },
];

function makeFixtureContent(id: string, title: string): Content {
  return {
    id,
    type: "MOVIE",
    title,
    original_title: title,
    description: "Synthetic local preview artwork; this is not a catalog item.",
    image_url: artworkUrl,
    tagline: null,
    imdb_id: null,
    release_date: null,
    duration_minutes: null,
    status: null,
    authors: null,
    images: [],
    platforms: null,
  };
}

export function ModerationPreviewPage({ country }: { country?: string }) {
  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-6xl space-y-8 px-6 py-10 text-white"
    >
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-200">
          Development preview · no enforcement
        </p>
        <h1 className="text-3xl font-bold">Moderation visual preview</h1>
        <p className="max-w-3xl text-sm leading-6 text-white/75">
          Fixture cards below demonstrate the shared content-card treatment.
          The optional lookup reads one submitted ContentItem through the normal
          Core client and session. It does not call Jev or write moderation data.
        </p>
      </header>

      <section aria-labelledby="fixture-heading" className="space-y-4">
        <div>
          <h2 id="fixture-heading" className="text-xl font-semibold">
            Explicit and unknown fixture states
          </h2>
          <p className="mt-1 text-sm text-white/70">
            Every card is synthetic and labeled as a fixture. Missing, stale,
            and needs-review states are not shown as safe.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {fixtures.map(({ id, title, summary }) => (
            <div className="w-56" key={id}>
              <ContentCard
                item={makeFixtureContent(id, title)}
                showAddToList={false}
                disableDetailNavigation
                moderationSummary={summary}
                badgeSlot={<ModerationBadge source="Fixture" summary={summary} />}
                footerSlot={<span>Synthetic fixture · not stored in Core</span>}
              />
            </div>
          ))}
        </div>
      </section>

      <ModerationCoreItemLookup country={country} />

      <aside className="max-w-3xl space-y-2 rounded-lg border border-white/15 bg-white/5 p-4 text-sm text-white/75">
        <p>
          The blur is a visual CSS treatment only. It does not prevent access to
          or downloading the underlying image.
        </p>
        <p>
          The existing adult-content preference keeps its current direct-search
          meaning; this preview does not change that preference or reveal state.
        </p>
      </aside>
    </main>
  );
}
