import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Dices, Sparkles } from "lucide-react";

import { Card } from "@/components/common/cards/Card";
import { getListItemSubtitle, getListItemTitle } from "@/components/common/cards/ListItemCard/utils";
import { Button } from "@/components/common/ui/Button";
import { listActions } from "@/lib/api";
import { CONTENT_TYPE_DEFINITIONS } from "@/lib/contentTypes";
import { type SourceData, type UserListDetail } from "@/lib/types";
import { getCardImageUrl } from "@/lib/utils/imageUtils";

const RANDOM_ENABLED_DYNAMIC_KEYS = new Set([
  "backlog",
  "movies",
  "series",
  "games",
  "albums",
  "books",
]);

const TRACKING_STATUS_LABELS = {
  backlog: "Backlog",
  in_progress: "In progress",
  on_hold: "On hold",
  dropped: "Dropped",
  completed: "Completed",
} as const;

interface DynamicListRandomPickProps {
  list: UserListDetail;
}

export function DynamicListRandomPick({ list }: DynamicListRandomPickProps) {
  const randomMutation = useMutation({
    mutationFn: () => listActions.pickRandom(list.id),
  });
  const item = randomMutation.data?.result ?? null;

  if (!RANDOM_ENABLED_DYNAMIC_KEYS.has(list.dynamic_key ?? "")) {
    return null;
  }

  const title = item ? getListItemTitle(item) : "";
  const subtitle = item ? getListItemSubtitle(item) : "";
  const sourceData = item?.content_item.source_data as SourceData | undefined;
  const imageUrl = getCardImageUrl(sourceData?.images, sourceData?.image_url);
  const trackingStatus = item?.content_item.current_user_tracking?.status;
  const contentType = item
    ? CONTENT_TYPE_DEFINITIONS[item.content_item.content_type]
    : null;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="mb-4 flex items-start gap-3">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
        <div>
          <h3 className="text-xl font-bold text-white">Choose for me</h3>
          <p className="mt-1 text-sm text-white/60">
            Pick something planned from this list.
          </p>
        </div>
      </div>

      <Button
        onClick={() => randomMutation.mutate()}
        disabled={randomMutation.isPending}
        className="w-full cursor-pointer justify-center gap-2 bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
        size="lg"
      >
        <Dices className="h-5 w-5" />
        {randomMutation.isPending
          ? "Choosing…"
          : item
            ? "Choose another"
            : "Choose for me"}
      </Button>

      {randomMutation.isSuccess && !item ? (
        <p className="mt-4 text-sm text-white/65" role="status">
          There are no planned items to choose from yet.
        </p>
      ) : null}

      {item && contentType ? (
        <div
          className="mt-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-200"
          aria-live="polite"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-200">
            Your pick
          </p>
          <Link
            to="/content/$id"
            params={{ id: String(item.content_item.id) }}
            preload="intent"
            aria-label={`View ${title}`}
            className="block rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-white/80"
          >
            <Card
              id={`random-pick-${item.id}`}
              title={title}
              type={item.content_item.content_type}
              backgroundImage={imageUrl ?? undefined}
              backgroundImageAlt={`${title} artwork`}
              isEmpty={!imageUrl}
              priorityImage
              disableHover
            >
              <Card.Footer className="flex-wrap gap-x-1.5 gap-y-1">
                <span>{contentType.label}</span>
                {trackingStatus ? <span aria-hidden="true">•</span> : null}
                {trackingStatus ? (
                  <span>{TRACKING_STATUS_LABELS[trackingStatus]}</span>
                ) : null}
                {subtitle ? (
                  <span className="basis-full line-clamp-1 text-white/65">
                    {subtitle}
                  </span>
                ) : null}
              </Card.Footer>
            </Card>
          </Link>
        </div>
      ) : null}
    </section>
  );
}
