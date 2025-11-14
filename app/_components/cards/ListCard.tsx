import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { List as ListIcon, Package, Lock, Users } from "lucide-react";

import Card from "../Card";
import { ListType } from "@/lib/api/types";
import { ListWithItems } from "@/types";

interface ListCardProps {
  list: ListWithItems;
  className?: string;
}

export default function ListCard({ list, className }: ListCardProps) {
  const router = useRouter();
  const id = String(list.id);
  const title = list.name;

  // Check if list has items
  const hasItems = list.items && list.items.length > 0;

  // Calculate actual item count from items array
  const actualItemCount = list.items?.length || 0;
  const itemCount = list.item_count || String(actualItemCount);
  const memberCount = list.member_count || "1"; // Default to 1 (owner)

  const memberInfo = `${memberCount} ${
    parseInt(memberCount) === 1 ? "member" : "members"
  }`;
  const itemInfo = `${itemCount} ${
    parseInt(itemCount) === 1 ? "item" : "items"
  }`;

  const isShared = list.list_type === ListType.SHARED;
  const ListTypeIcon = isShared ? Users : Lock;
  const listTypeLabel = isShared ? "Shared" : "Personal";

  const footerInfo = isShared ? memberInfo + " • " + itemInfo : itemInfo;

  // Collect all images from list items (memoized to prevent unnecessary recalculations)
  const backgroundImages = useMemo(() => {
    const images: string[] = [];
    if (hasItems) {
      list.items!.forEach((item) => {
        if (item?.content_item?.source_data) {
          const sourceData = item.content_item.source_data as any;
          // Try different possible image fields from different content types
          const image = sourceData.image_url ||
                       sourceData.poster_path ||
                       sourceData.cover_url ||
                       sourceData.cover ||
                       sourceData.images?.[0]?.image_url;
          if (image) {
            images.push(image);
          }
        }
      });
    }
    return images;
  }, [hasItems, list.items]);

  // Set up image rotation
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (backgroundImages.length <= 1) return; // No rotation needed for 0 or 1 image

    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) =>
        (prevIndex + 1) % backgroundImages.length
      );
    }, 3000); // Rotate every 3 seconds

    return () => clearInterval(interval);
  }, [backgroundImages.length]);

  const backgroundImage = backgroundImages.length > 0
    ? backgroundImages[currentImageIndex]
    : undefined;

  const handleClick = () => {
    router.push(`/lists/${id}`);
  };

  return (
    <div onClick={handleClick} className="cursor-pointer">
      <Card
        id={id}
        title={title}
        icon={ListIcon}
        backgroundImage={backgroundImage}
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
    </div>
  );
}
