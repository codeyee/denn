import Card from ".";

import { contentTypeEnum } from "@/types/types";
import { ContentItem } from "@/types/contentTypes";

interface ContentCardProps {
  item: ContentItem;
  className?: string;
}

export default function ContentCard({ item, className }: ContentCardProps) {
  // Helper function to get the content type as enum
  const getContentType = (): contentTypeEnum => {
    if ("type" in item && typeof item.type === "string") {
      // For Movie, TVShow, and MusicAlbum with type field
      if (item.type === "movie") return contentTypeEnum.movie;
      if (item.type === "tv") return contentTypeEnum.tv;
      if (item.type === "album") return contentTypeEnum.music;
    }

    // For Game - check if it has platforms or authors array combined with no type field matching movie/tv
    if ("platforms" in item) return contentTypeEnum.game;

    // For Book - check if it has pages field
    if ("pages" in item) return contentTypeEnum.book;

    // For MusicAlbum - check if it has total_tracks
    if ("total_tracks" in item) return contentTypeEnum.music;

    // Default fallback
    return contentTypeEnum.movie;
  };

  // Get common fields
  const title = item.title;
  const imageUrl = item.image_url;
  const id = String(item.id);
  const type = getContentType();

  // Get additional info for footer
  const getFooterInfo = (): string => {
    if ("release_date" in item && item.release_date) {
      return item.release_date;
    }
    if ("total_tracks" in item && item.total_tracks) {
      return `${item.total_tracks} tracks`;
    }
    if ("pages" in item && item.pages) {
      return `${item.pages} pages`;
    }
    return "";
  };

  // Get authors/creators if available
  const getAuthors = (): string => {
    if ("authors" in item && item.authors && item.authors.length > 0) {
      return item.authors.join(", ");
    }
    return "";
  };

  const footerInfo = getFooterInfo();
  const authors = getAuthors();

  return (
    <Card
      type={type}
      id={id}
      title={title}
      backgroundImage={imageUrl || "/images/placeholder.jpg"}
      backgroundImageAlt={`${title} cover image`}
      className={className}
      isEmpty={!imageUrl}
    >
      <Card.Footer>
        {authors && <div>{authors}</div>}
        {footerInfo && <div>{footerInfo}</div>}
      </Card.Footer>
    </Card>
  );
}
