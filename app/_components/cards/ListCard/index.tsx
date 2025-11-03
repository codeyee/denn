import { useState, useEffect, useMemo } from "react";
import { List as ListIcon, Package, User, Users } from "lucide-react";

import Card from "../Card";
import { List, ListType } from "@/types/contentTypes";

interface ListCardProps {
  list: List;
  className?: string;
}

const IMAGE_ROTATION_INTERVAL = 5000;

export default function ListCard({ list, className }: ListCardProps) {
  const id = String(list.id);
  const title = list.name;

  const imageUrls = useMemo(() => {
    return list.items
      ?.map((item) => item.content_item.source_data.image_url)
      .filter((url): url is string => Boolean(url)) || [];
  }, [list.items]);

  const [_, setCurrentImageIndex] = useState(0);
  const [currentImage, setCurrentImage] = useState<string>("");
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
    }, IMAGE_ROTATION_INTERVAL);

    return () => clearInterval(interval);
  }, [imageUrls]);

  const memberListCount = list.members ? list.members.length : 0;
  const itemListCount = list.items ? list.items.length : 0;

  const itemCount = list.item_count ?? String(itemListCount);
  const memberCount = list.member_count ?? String(memberListCount);

  const memberInfo = `${memberCount} ${parseInt(memberCount) === 1 ? 'member' : 'members'}`;
  const itemInfo = `${itemCount} ${parseInt(itemCount) === 1 ? 'item' : 'items'}`;

  const isShared = list.list_type === ListType.SHARED;
  const ListTypeIcon = isShared ? Users : User;
  const listTypeLabel = isShared ? "Shared" : "Personal";

  const footerInfo = isShared
    ? memberInfo + ' • ' + itemInfo
    : itemInfo;

  return (
    <Card
      id={id}
      title={title}
      icon={ListIcon}
      backgroundImage={isEmpty ? undefined : currentImage}
      backgroundImageAlt={`${title} list background`}
      className={`${className} cursor-pointer`}
      isEmpty={isEmpty}
      emptyIcon={Package}
    >
      <Card.Footer>
        <div className="flex items-center gap-1.5">
          <ListTypeIcon className="w-3.5 h-3.5" />
          <span>{listTypeLabel}</span>
        </div>
        <div>• {footerInfo}</div>
      </Card.Footer>
    </Card>
  );
}

