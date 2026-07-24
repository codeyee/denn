import { Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useReducedMotion } from "motion/react";
import { List as ListIcon, Package, Lock, Users } from "lucide-react";

import { Card } from "./Card";
import { ListType } from "@/lib/types";
import { ListWithItems, SourceData } from "@/lib/types";
import { getCardImageUrl } from "@/lib/utils/imageUtils";
import { useSettings } from "@/hooks/useSettings";

interface ListCardProps {
  list: ListWithItems;
  className?: string;
}

export function ListCard({ list, className }: ListCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const { settings } = useSettings();
  const id = String(list.id);
  const title = list.name;

  const hasItems = list.items && list.items.length > 0;
  const actualItemCount = list.items?.length || 0;
  const itemCount = list.item_count || String(actualItemCount);
  const memberCount = list.members?.length || 1;

  const memberInfo = `${memberCount} ${memberCount === 1 ? "member" : "members"}`;
  const itemInfo = `${itemCount} ${parseInt(itemCount) === 1 ? "item" : "items"}`;

  const isShared = list.list_type === ListType.SHARED;
  const ListTypeIcon = isShared ? Users : Lock;
  const listTypeLabel = isShared ? "Shared" : "Personal";

  const footerInfo = isShared ? memberInfo + " • " + itemInfo : itemInfo;

  const backgroundImages = useMemo(() => {
    const images: string[] = [];
    if (hasItems) {
      list.items!.forEach((item) => {
        if (item?.content_item?.source_data) {
          const sourceData = item.content_item.source_data as SourceData;
          const image = getCardImageUrl(sourceData.images, sourceData.image_url);
          if (image) {
            images.push(image);
          }
        }
      });
    }
    return images;
  }, [hasItems, list.items]);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (
      backgroundImages.length <= 1 ||
      shouldReduceMotion ||
      !settings.animationsEnabled
    ) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) =>
        (prevIndex + 1) % backgroundImages.length
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [backgroundImages.length, settings.animationsEnabled, shouldReduceMotion]);

  return (
    <Link
      to="/lists/$id"
      params={{ id }}
      preload="intent"
      aria-label={`Open list ${title}`}
      className="block rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-white/80"
    >
      <Card
        id={id}
        title={title}
        icon={ListIcon}
        backgroundImages={backgroundImages}
        activeImageIndex={currentImageIndex}
        backgroundImageAlt={`${title} list background`}
        className={className}
        isEmpty={!hasItems}
        emptyIcon={Package}
      >
        <Card.Footer>
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <div className="flex items-center gap-1.5">
              <ListTypeIcon className="w-3.5 h-3.5" />
              <span>{listTypeLabel}</span>
            </div>
            <div className="hidden sm:block">•</div>
            <div>{footerInfo}</div>
          </div>
        </Card.Footer>
      </Card>
    </Link>
  );
}
