import { Link } from "@tanstack/react-router";
import { ExternalLink, Play } from "lucide-react";

import { MediaListItem } from "@/components/common/lists/MediaListItem";
import { Button } from "@/components/common/ui/Button";
import {
  getContentTypeIcon,
  getContentTypeLabel,
} from "@/lib/icons/contentTypeIcons";
import type { RandomPickerItem } from "./types";

interface RandomPickerResultProps {
  result: RandomPickerItem | null;
  isPreview?: boolean;
  canStart: boolean;
  isStarting: boolean;
  onStart: () => void;
}

export function RandomPickerResult({
  result,
  isPreview = false,
  canStart,
  isStarting,
  onStart,
}: RandomPickerResultProps) {
  return (
    <div
      className="mt-4 border-t border-white/10 pt-4"
      aria-live={isPreview ? undefined : "polite"}
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-amber-200">
        Your pick
      </p>
      {result ? (
        <ResultCard
          result={result}
          isPreview={isPreview}
          canStart={canStart}
          isStarting={isStarting}
          onStart={onStart}
        />
      ) : (
        <ResultPlaceholder />
      )}
    </div>
  );
}

function ResultCard({
  result,
  isPreview,
  canStart,
  isStarting,
  onStart,
}: {
  result: RandomPickerItem;
  isPreview: boolean;
  canStart: boolean;
  isStarting: boolean;
  onStart: () => void;
}) {
  const ContentIcon = getContentTypeIcon(result.contentType);
  const contentTypeLabel = getContentTypeLabel(result.contentType);

  return (
    <MediaListItem
      title={result.title}
      titleIcon={
        <ContentIcon
          aria-label={contentTypeLabel}
          className="h-4 w-4 md:h-5 md:w-5"
        />
      }
      description={result.subtitle ?? undefined}
      image={result.imageUrl}
      imageAlt={`${result.title} artwork`}
      mediaFallback={<ContentIcon aria-hidden="true" className="h-10 w-10" />}
      variant="review"
      className="h-64 md:h-56"
    >
      {!isPreview ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            asChild
            size="sm"
            variant="outline"
            className="gap-2 border-blue-600/30 bg-blue-600/20 text-blue-300 hover:bg-blue-600/40 hover:text-blue-200"
          >
            <Link
              to="/content/$id"
              params={{ id: String(result.contentId) }}
              preload="intent"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              View details
            </Link>
          </Button>
          {canStart ? (
            <Button
              size="sm"
              onClick={onStart}
              disabled={isStarting}
              className="gap-2"
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              {isStarting ? "Updating…" : "Start in progress"}
            </Button>
          ) : null}
        </div>
      ) : null}
    </MediaListItem>
  );
}

function ResultPlaceholder() {
  return (
    <div className="h-64 overflow-hidden rounded-lg border border-white/10 bg-list-item-background md:h-56">
      <div className="flex h-full items-center gap-4 px-5">
        <div className="h-14 w-14 shrink-0 animate-pulse rounded-xl bg-white/10 motion-reduce:animate-none" />
        <div className="flex-1 space-y-3">
          <div className="h-4 w-2/3 animate-pulse rounded bg-white/10 motion-reduce:animate-none" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-white/10 motion-reduce:animate-none" />
          <div className="h-11 w-32 animate-pulse rounded-md bg-white/10 motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  );
}
