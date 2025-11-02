import { useState, useEffect, useMemo } from "react";
import { List as ListIcon, Package, User, Users } from "lucide-react";

import Card from ".";
import { List, ListType } from "@/types/contentTypes";

interface ListCardProps {
  list: List;
  className?: string;
}

export default function ListCard({ list, className }: ListCardProps) {
  const id = String(list.id);
  const title = list.name;
  const description = list.description;

  const imageUrls = useMemo(() => {
    return list.items
      ?.map((item) => item.content_item.source_data.image_url)
      .filter((url): url is string => Boolean(url)) || [];
  }, [list.items]);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentImage, setCurrentImage] = useState<string>("/images/placeholder.jpg");
  const isEmpty = imageUrls.length === 0;

  useEffect(() => {
    if (imageUrls.length === 0) {
      return;
    }

    setCurrentImage(imageUrls[0]);
    setCurrentImageIndex(0);

    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % imageUrls.length;
        setCurrentImage(imageUrls[nextIndex]);
        return nextIndex;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [imageUrls]);

  // Format member and item counts
  const memberInfo = `${list.member_count} ${parseInt(list.member_count) === 1 ? 'member' : 'members'}`;
  const itemInfo = `${list.item_count} ${parseInt(list.item_count) === 1 ? 'item' : 'items'}`;

  // Determine list type and icon
  const isShared = list.list_type === ListType.SHARED;
  const ListTypeIcon = isShared ? Users : User;
  const listTypeLabel = isShared ? "Shared" : "Personal";

  const footerInfo = isShared ? memberInfo + ' - ' + itemInfo : itemInfo;

  return (
    <Card
      id={id}
      title={title}
      icon={ListIcon}
      backgroundImage={isEmpty ? undefined : currentImage}
      backgroundImageAlt={`${title} list background`}
      className={className}
      isEmpty={isEmpty}
      emptyIcon={Package}
      emptyBackgroundColor="#374151"
    >
      <Card.Footer>
        <div className="flex items-center gap-1.5">
          <ListTypeIcon className="w-3.5 h-3.5" />
          <span>{listTypeLabel}</span>
        </div>
        <div>- {footerInfo}</div>
      </Card.Footer>
    </Card>
  );
}

