"use client";

import { useMemo } from "react";
import { Card } from "../Card";
import { ContentType } from "@/lib/types";
import { formatSeasonTitle } from "@/lib/utils/titleUtils";
import { Content } from "@/lib/types";
import { Plus } from "lucide-react";
import { Button } from "@/app/_components/common/ui/Button";
import { AddToListModal } from "@/app/_components/common/modals/AddToListModal";
import { getSourceApi } from "@/lib/utils/contentTypeUtils";
import { buildContentUrl } from "@/lib/utils/navigationUtils";
import { useSmartNavigation } from "@/app/_hooks/useSmartNavigation";
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
  const getNavigationUrl = () => {
    try {
      const contentType = item.type as ContentType;
      const sourceApi = getSourceApi(contentType);
      const externalId = String(item.id);

      return buildContentUrl({
        externalId,
        sourceApi,
        contentType,
      });
    } catch (error) {
      console.error("Failed to build navigation URL:", error);
      return null;
    }
  };

  const navigation = useSmartNavigation(getNavigationUrl);
  const modal = useContentCardModal(item);

  const isSeason = item.type === "SEASON";
  const title =
    isSeason && "tv_show_name" in item
      ? formatSeasonTitle(item.tv_show_name, item.title)
      : item.title;

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
        onClick={navigation.handleClick}
        onAuxClick={navigation.handleAuxClick}
        onMouseDown={navigation.handleMouseDown}
        className={`cursor-pointer ${className || ""}`}
        role="button"
        tabIndex={0}
        onKeyDown={navigation.handleKeyDown}
        aria-label={`View details for ${title}`}
      >
        <Card
          type={type as ContentType}
          id={id}
          title={title}
          backgroundImage={imageUrl || ""}
          backgroundImageAlt={`${title} cover image`}
          isEmpty={!imageUrl}
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
                  className="w-full bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add to List
                </Button>
              </div>
            </Card.HoverContent>
          }
        >
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
      </div>

      <AddToListModal
        isOpen={modal.isOpen}
        onOpenChange={modal.closeModal}
        contentItem={modal.contentItem}
      />
    </>
  );
}
