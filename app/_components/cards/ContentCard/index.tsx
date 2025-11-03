import Card from "../Card";
import { contentTypeEnum } from "@/types/types";
import { ContentItem } from "@/types/contentTypes";

interface ContentCardProps {
  item: ContentItem;
  className?: string;
}

export default function ContentCard({ item, className }: ContentCardProps) {
  const getContentType = (): contentTypeEnum => {
    if ("type" in item && typeof item.type === "string") {
      if (item.type === "movie") return contentTypeEnum.movie;
      if (item.type === "tv") return contentTypeEnum.tv;
      if (item.type === "album") return contentTypeEnum.music;
    }

    if ("platforms" in item) return contentTypeEnum.game;
    if ("pages" in item) return contentTypeEnum.book;
    if ("total_tracks" in item) return contentTypeEnum.music;

    return contentTypeEnum.movie;
  };

  const getFooterInfo = (): string => {
    const footerInfo: string[] = [];

    if ("pages" in item && item.pages) {
      footerInfo.push(`${item.pages} pages`);
    }

    if ("total_tracks" in item && item.total_tracks) {
      footerInfo.push(`${item.total_tracks} ${item.total_tracks === 1 ? 'track' : 'tracks'}`);
    }

    return footerInfo.join(" - ");
  };

  const getAuthors = (): string => {
    if ("authors" in item && item.authors && item.authors.length > 0) {
      return item.authors.join(", ");
    }
    return "";
  };

  const getReleaseDate = (): string => {
    if ("release_date" in item && item.release_date) {
      return item.release_date;
    }
    return "";
  };

  const getOriginalTitle = (): string => {
    if ("original_title" in item && item.original_title) {
      return item.original_title;
    }
    return "";
  };

  const title = item.title;
  const imageUrl = item.image_url;
  const id = String(item.id);
  const type = getContentType();

  const footerInfo = getFooterInfo();
  const authors = getAuthors();
  const originalTitle = getOriginalTitle();
  const releaseDate = getReleaseDate();

  const originalTitleIsSameAsTitle = originalTitle.toLowerCase() === title.toLowerCase();

  return (
    <Card
      type={type}
      id={id}
      title={title}
      backgroundImage={imageUrl || ""}
      backgroundImageAlt={`${title} cover image`}
      className={className}
      isEmpty={!imageUrl}
    >
      <Card.Footer>
        <div className="flex flex-col gap-1.5">
          {originalTitle && !originalTitleIsSameAsTitle && <div>{originalTitle}</div>}
          {authors && <div>{authors}</div>}
          {releaseDate && <div>{releaseDate}</div>}
          {footerInfo && <div>{footerInfo}</div>}
        </div>
      </Card.Footer>
    </Card>
  );
}
