import { ListItem } from "@/types";
import { Author } from "@/lib/api/types";
import { formatSeasonTitle } from "@/lib/utils/titleUtils";

export function getListItemTitle(item: ListItem): string {
  const contentItem = item.content_item;
  const sourceData = contentItem.source_data;

  const isSeason = contentItem.content_type === "SEASON";
  const title = isSeason && "tv_show_name" in sourceData
    ? formatSeasonTitle(sourceData.tv_show_name, sourceData.title)
    : sourceData?.title || "Untitled";

  return title;
}

export function getListItemSubtitle(item: ListItem): string {
  const contentItem = item.content_item;
  const sourceData = contentItem.source_data;

  if (contentItem.content_type === "SEASON") {
    return "";
  }

  if (
    "original_title" in sourceData &&
    sourceData.original_title &&
    sourceData.original_title !== sourceData.title
  ) {
    return sourceData.original_title;
  }

  if (
    (contentItem.content_type === "ALBUM" ||
      contentItem.content_type === "BOOK") &&
    "authors" in sourceData &&
    sourceData.authors
  ) {
    return (sourceData.authors as Author[])
      ?.map((author) => author.name)
      .join(", ");
  }

  return "";
}
