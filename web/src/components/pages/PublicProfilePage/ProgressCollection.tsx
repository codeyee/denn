import { ContentCard } from "@/components/common/cards/ContentCard";
import type { PublicProgressItem } from "@/lib/types";
import { ProfileCardIndicators } from "./ProfileIndicators";
import { ProgressList, progressLabel } from "./ProgressList";
import {
  formatProfileDate,
  getProfileContentAttribution,
  profileContentCardItem,
} from "./utils";

const PROFILE_CONTENT_GRID_CLASS =
  "grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6";

export function ProgressCollection({
  items,
  view,
}: {
  items: PublicProgressItem[];
  view: "grid" | "list";
}) {
  return view === "list" ? (
    <ProgressList items={items} />
  ) : (
    <ProgressGrid items={items} />
  );
}

function ProgressGrid({ items }: { items: PublicProgressItem[] }) {
  return (
    <div className={PROFILE_CONTENT_GRID_CLASS}>
      {items.map((item) => (
        <ContentCard
          key={item.id}
          item={profileContentCardItem(item.content)}
          showAddToList={false}
          badgeSlot={
            item.rating || item.is_favorite ? (
              <ProfileCardIndicators
                rating={
                  item.rating ? Number(item.rating.score) : null
                }
                review={
                  item.rating?.review
                    ? {
                        contentId: item.content.id,
                        title: item.content.title,
                      }
                    : null
                }
                isFavorite={item.is_favorite}
              />
            ) : null
          }
          metadataSlot={
            <div className="flex min-w-0 flex-col gap-1.5">
              {getContentAttribution(item) ? (
                <div className="line-clamp-2">
                  {getContentAttribution(item)}
                </div>
              ) : null}
              <div>
                {progressLabel(item.status)} ·{" "}
                {formatProfileDate(item.updated_at)}
              </div>
            </div>
          }
        />
      ))}
    </div>
  );
}

function getContentAttribution(item: PublicProgressItem): string {
  return getProfileContentAttribution(item.content);
}
