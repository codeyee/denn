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

export function CompletedGrid({
  items,
  showDate = true,
}: {
  items: PublicCompletedItem[];
  showDate?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {items.map((item) => (
        <ContentCard
          key={item.content.id}
          item={profileContentCardItem(item.content)}
          showAddToList={false}
          badgeSlot={
            item.score ? (
              <RatingBadge rating={Number(item.score)} variant="user" />
            ) : item.is_favorite ? (
              <span className="grid h-8 w-8 place-items-center rounded-full bg-black/70 text-fuchsia-300">
                <Heart aria-label="Favorite" className="h-4 w-4 fill-current" />
              </span>
            ) : null
          }
          footerSlot={
            showDate ? `Completed ${formatProfileDate(item.completed_at)}` : undefined
          }
        />
      ))}
    </div>
  );
}

export function FavoriteGrid({ items }: { items: PublicFavorite[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <ContentCard
          key={item.content.id}
          item={profileContentCardItem(item.content)}
          showAddToList={false}
          badgeSlot={
            <span className="grid h-8 w-8 place-items-center rounded-full bg-black/70 text-fuchsia-300">
              <Heart aria-label="Favorite" className="h-4 w-4 fill-current" />
            </span>
          }
          footerSlot={
            item.score ? (
              <RatingBadge rating={Number(item.score)} variant="user" />
            ) : undefined
          }
        />
      ))}
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
