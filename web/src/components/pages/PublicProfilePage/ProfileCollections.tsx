import { Heart } from "lucide-react";

import { ContentCard } from "@/components/common/cards/ContentCard";
import { ListCard } from "@/components/common/cards/ListCard";
import { RatingBadge } from "@/components/common/ui/RatingBadge";
import type {
  PublicCompletedItem,
  PublicFavorite,
  PublicListSummary,
} from "@/lib/types";
import { formatProfileDate, profileContentCardItem, profileListCardItem } from "./utils";

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
              <div className="flex items-center gap-2">
                {item.is_favorite ? <FavoriteBadge /> : null}
                {item.score ? (
                  <RatingBadge rating={Number(item.score)} variant="user" />
                ) : null}
              </div>
            ) : null
          }
          metadataSlot={
            <ProfileCardMetadata
              subtitle={item.content.subtitle}
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
            <div className="flex items-center gap-2">
              <FavoriteBadge />
              {item.score ? (
                <RatingBadge rating={Number(item.score)} variant="user" />
              ) : null}
            </div>
          }
        />
      ))}
    </div>
  );
}

function FavoriteBadge() {
  return (
    <span className="grid h-8 w-8 place-items-center rounded-full bg-black/70 text-rose-400">
      <Heart aria-label="Favorite" className="h-4 w-4 fill-current" />
    </span>
  );
}

function ProfileCardMetadata({
  subtitle,
  date,
}: {
  subtitle: string | null;
  date: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {subtitle ? <div className="line-clamp-2">{subtitle}</div> : null}
      <div>{date}</div>
    </div>
  );
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
