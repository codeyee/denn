import { PlayCircle } from "lucide-react";

import { ContentCard } from "@/components/common/cards/ContentCard";
import { Carousel } from "@/components/common/ui/Carousel";
import type { PublicProgressItem } from "@/lib/types";
import {
  formatProfileDate,
  getProfileContentAttribution,
  profileContentCardItem,
} from "@/components/pages/PublicProfilePage/utils";
import { progressLabel } from "@/components/pages/PublicProfilePage/ProgressList";

export function InProgressCarousel({
  items,
}: {
  items: PublicProgressItem[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="mb-4 md:mb-8">
      <Carousel title="In Progress" titleIcon={PlayCircle}>
        {items.map((item) => (
          <ContentCard
            key={item.id}
            item={profileContentCardItem(item.content)}
            showAddToList={false}
            metadataSlot={
              <div className="flex min-w-0 flex-col gap-1.5">
                {getProfileContentAttribution(item.content) ? (
                  <div className="line-clamp-2">
                    {getProfileContentAttribution(item.content)}
                  </div>
                ) : null}
                <div>
                  {progressLabel(item.status)} · {formatProfileDate(item.updated_at)}
                </div>
              </div>
            }
          />
        ))}
      </Carousel>
    </div>
  );
}
