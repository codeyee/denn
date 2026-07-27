import { ContentCard } from "@/components/common/cards/ContentCard";
import { ListCard } from "@/components/common/cards/ListCard";
import type {
  PublicCompletedItem,
  PublicFavorite,
  PublicListSummary,
} from "@/lib/types";
import {
  formatProfileDate,
  getProfileContentAttribution,
  profileContentCardItem,
  profileListCardItem,
} from "./utils";
import { ProfileCardIndicators } from "./ProfileIndicators";

const PROFILE_CONTENT_GRID_CLASS =
  "grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6";

export function CompletedGrid({
  items,
}: {
  items: PublicCompletedItem[];
}) {
  return (
    <div className={PROFILE_CONTENT_GRID_CLASS}>
      {items.map((item) => (
        <ContentCard
          key={item.content.id}
          item={profileContentCardItem(item.content)}
          showAddToList={false}
          badgeSlot={
            item.score || item.is_favorite ? (
              <ProfileCardIndicators
                rating={item.score ? Number(item.score) : null}
                isFavorite={item.is_favorite}
              />
            ) : null
          }
          metadataSlot={
            <ProfileCardMetadata
              attribution={getContentAttribution(item.content)}
              date={`Completed ${formatProfileDate(item.completed_at)}`}
            />
          }
        />
      ))}
    </div>
  );
}

export function FavoriteGrid({ items }: { items: PublicFavorite[] }) {
  return (
    <div className={PROFILE_CONTENT_GRID_CLASS}>
      {items.map((item) => (
        <ContentCard
          key={item.content.id}
          item={profileContentCardItem(item.content)}
          showAddToList={false}
          badgeSlot={
            <ProfileCardIndicators
              rating={item.score ? Number(item.score) : null}
              isFavorite
            />
          }
        />
      ))}
    </div>
  );
}

function ProfileCardMetadata({
  attribution,
  date,
}: {
  attribution: string;
  date: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {attribution ? <div className="line-clamp-2">{attribution}</div> : null}
      <div>{date}</div>
    </div>
  );
}

function getContentAttribution(
  content: PublicCompletedItem["content"],
): string {
  return getProfileContentAttribution(content);
}

export function PublicListGrid({ lists }: { lists: PublicListSummary[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
      {lists.map((list) => (
        <ListCard
          key={list.id}
          list={profileListCardItem(list)}
          badgeSlot={
            <span className="rounded-full bg-black/70 px-2.5 py-1 text-xs font-semibold capitalize text-white">
              {list.role}
            </span>
          }
          footerSlot={
            list.description ||
            `${list.member_count} ${list.member_count === 1 ? "member" : "members"}`
          }
        />
      ))}
    </div>
  );
}
