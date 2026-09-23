import { useState, type FormEvent } from "react";

import { ContentCard } from "@/components/common/cards/ContentCard";
import { useContentDetailQuery } from "@/lib/api/queries/useContentDetailQuery";
import type { Content, ContentItem } from "@/lib/types";
import { parseModerationSummary } from "@/lib/utils/moderationUtils";
import { ModerationBadge } from "./moderationPreviewUtils";

function isContentDetail(value: ContentItem["source_data"]): value is Content {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof value.title === "string" &&
    typeof value.type === "string" &&
    Array.isArray(value.images)
  );
}

function CoreItemPreview({ item }: { item: ContentItem }) {
  const summary = parseModerationSummary(item.moderation);
  const sourceData = item.source_data;
  const content = isContentDetail(sourceData)
    ? { ...sourceData, denn_id: undefined }
    : null;

  return (
    <div className="space-y-3">
      <p className="text-sm text-white/80">
        Core ContentItem <code>#{item.id}</code> · read-only response.
      </p>
      {!summary ? (
        <p
          className="rounded-lg border border-amber-300/40 bg-amber-300/10 p-3 text-sm text-amber-100"
          role="status"
        >
          Core did not return a valid moderation summary. Treat this as unknown,
          not as safe.
        </p>
      ) : null}
      {content ? (
        <div className="w-56">
          <ContentCard
            item={content}
            showAddToList={false}
            disableDetailNavigation
            moderationSummary={summary ?? undefined}
            badgeSlot={<ModerationBadge source="Core API" summary={summary} />}
            footerSlot={<span>Stored Core summary · no fixture</span>}
          />
        </div>
      ) : (
        <p className="text-sm text-white/70" role="status">
          The Core response has no usable persisted detail payload for a card.
          Its moderation summary above is still shown as returned.
        </p>
      )}
    </div>
  );
}

export function ModerationCoreItemLookup({ country }: { country?: string }) {
  const [inputValue, setInputValue] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const query = useContentDetailQuery(selectedId ?? 0, country);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = inputValue.trim();
    const parsedId = Number(trimmed);

    if (!/^[1-9]\d*$/.test(trimmed) || !Number.isSafeInteger(parsedId)) {
      setSelectedId(null);
      setValidationMessage("Enter a positive numeric ContentItem ID.");
      return;
    }

    setSelectedId(parsedId);
    setValidationMessage(null);
  }

  return (
    <section aria-labelledby="core-lookup-heading" className="space-y-4">
      <div>
        <h2 id="core-lookup-heading" className="text-xl font-semibold">
          Inspect one local Core item
        </h2>
        <p id="core-lookup-help" className="mt-1 max-w-3xl text-sm text-white/70">
          Enter a persisted ContentItem ID to make one read-only Core request.
          This lookup is not repeated for fixture cards and does not treat a
          missing or stale summary as safe.
        </p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="flex max-w-xl flex-col gap-3 sm:flex-row"
      >
        <label className="flex-1 space-y-1 text-sm" htmlFor="content-item-id">
          <span>ContentItem ID</span>
          <input
            id="content-item-id"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-describedby="core-lookup-help"
            aria-invalid={Boolean(validationMessage)}
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            className="w-full rounded-md border border-white/30 bg-black/40 px-3 py-2 text-white outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-200"
          />
        </label>
        <button
          type="submit"
          className="self-end rounded-md bg-fuchsia-700 px-4 py-2 font-semibold text-white hover:bg-fuchsia-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Load Core item
        </button>
      </form>
      {validationMessage ? (
        <p className="text-sm text-amber-200" role="alert">
          {validationMessage}
        </p>
      ) : null}
      {selectedId !== null && query.isPending ? (
        <p className="text-sm text-white/70" role="status">
          Loading Core ContentItem #{selectedId}…
        </p>
      ) : null}
      {selectedId !== null && query.isError ? (
        <p className="text-sm text-amber-200" role="alert">
          Core could not load that item. Check the ID, local Core availability,
          and your current app session.
        </p>
      ) : null}
      {selectedId !== null && query.data ? (
        <CoreItemPreview item={query.data} />
      ) : null}
    </section>
  );
}
