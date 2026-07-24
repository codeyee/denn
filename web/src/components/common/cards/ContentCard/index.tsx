
import {
  useCallback,
  useMemo,
  useState,
  type MouseEvent,
} from "react";
import { Link } from "@tanstack/react-router";
import { Card } from "../Card";
import { ContentType } from "@/lib/types";
import { formatSeasonTitle } from "@/lib/utils/titleUtils";
import { Content } from "@/lib/types";
import { Plus } from "lucide-react";
import { Button } from "@/components/common/ui/Button";
import { AddToListModal } from "@/components/common/modals/AddToListModal";
import { usePrefetchContentDetail } from "@/lib/api/queries/usePrefetchContentDetail";
import { useHoverPrefetch } from "@/lib/perf/useHoverPrefetch";
import { useContentCardModal } from "./hooks/useContentCardModal";
import {
  getPosterImageUrl,
  getFooterInfo,
  getAuthorsText,
  getReleaseDate,
  getOriginalTitle,
  getDescription,
} from "./utils";

interface ContentCardProps {
  item: Content;
  className?: string;
}

export function ContentCard({ item, className }: ContentCardProps) {
  const [isNavigating, setIsNavigating] = useState(false);
  const modal = useContentCardModal(item);

  // Hover/focus/touch intent is read-only. Canonical ids were resolved once
  // when the enclosing homepage/search payload was loaded.
  const prefetchContentDetail = usePrefetchContentDetail();
  const handlePrefetch = useCallback(() => {
    if (item.denn_id) prefetchContentDetail(item.denn_id);
  }, [item.denn_id, prefetchContentDetail]);
  const hoverPrefetchHandlers = useHoverPrefetch(handlePrefetch);
  const handleNavigation = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      if (isNavigating) {
        event.preventDefault();
        return;
      }
      setIsNavigating(true);
    },
    [isNavigating],
  );

  const isSeason = item.type === "SEASON";
  const title =
    isSeason && "tv_show_name" in item
      ? formatSeasonTitle(item.tv_show_name, item.title)
      : item.title;
  const detailLinkProps = item.denn_id
    ? {
        to: "/content/$id" as const,
        params: { id: String(item.denn_id) },
        preload: "intent" as const,
        onClick: handleNavigation,
        "aria-label": `View details for ${title}`,
      }
    : null;

  const imageUrl = getPosterImageUrl(item);
  const id = String(item.id);
  const type = item.type;

  const footerInfo = useMemo(() => getFooterInfo(item), [item]);
  const authors = useMemo(() => getAuthorsText(item), [item]);
  const originalTitle = useMemo(() => getOriginalTitle(item), [item]);
  const releaseDate = useMemo(() => getReleaseDate(item), [item]);
  const description = useMemo(() => getDescription(item), [item]);

  const originalTitleIsSameAsTitle =
    originalTitle.toLowerCase() === title.toLowerCase();

  return (
    <>
      <div
        className={`relative group ${className || ""}`}
        {...hoverPrefetchHandlers}
      >
        <Card
          type={type as ContentType}
          id={id}
          title={title}
          backgroundImage={imageUrl || ""}
          backgroundImageAlt={`${title} cover image`}
          isEmpty={!imageUrl}
          hoverOverlay={
            detailLinkProps ? (
              <Link
                {...detailLinkProps}
                className="absolute inset-0 z-20 rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-white/80"
              />
            ) : undefined
          }
          hoverContent={
            <Card.HoverContent>
              <div className="space-y-3">
                {description && (
                  <p className="text-xs md:text-sm text-white/90 line-clamp-3">
                    {description}
                  </p>
                )}

                <Button
                  onClick={modal.openModal}
                  variant="secondary"
                  size="sm"
                  className="relative z-30 w-full bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add to List
                </Button>
              </div>
            </Card.HoverContent>
          }
        >
          {detailLinkProps && (
            <Link
              {...detailLinkProps}
              className="absolute inset-0 z-20 rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-white/80"
            />
          )}
          <Card.Footer>
            <div className="flex flex-col gap-1.5">
              {originalTitle && !originalTitleIsSameAsTitle && (
                <div>{originalTitle}</div>
              )}
              {authors && <div>{authors}</div>}
              {releaseDate && <div>{releaseDate}</div>}
              {footerInfo && <div>{footerInfo}</div>}
            </div>
          </Card.Footer>
        </Card>
        {isNavigating && (
          <div
            className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-xl bg-black/55 text-sm font-medium text-white"
            role="status"
          >
            Opening details…
          </div>
        )}
      </div>

      <AddToListModal
        isOpen={modal.isOpen}
        onOpenChange={modal.closeModal}
        contentItem={modal.contentItem}
      />
    </>
  );
}
