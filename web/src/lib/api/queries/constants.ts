import type { ProfileSearchParams } from "@/lib/types";

export const SUGGESTIONS_PAGE_SIZE = 30;
export const HOME_LIST_ITEMS_SIZE = 8;
export const HOME_LIST_IMAGES_SIZE = 4;
export const SEARCH_RESULT_LIMIT = 20;
export const BROWSE_PAGE_SIZE = 24;
export const RATINGS_PAGE_SIZE = 10;

export const HOME_LIST_FIELDS = [
  "id",
  "name",
  "item_count",
  "member_count",
  "list_type",
  "items.id",
  "items.content_item.source_data",
].join(",");

export const HOME_LIST_SOURCE_FIELDS = ["id", "images"].join(",");

export const HOME_PROGRESS_SEARCH = {
  tab: "progress",
  page: 1,
  status: ["in_progress"],
} satisfies ProfileSearchParams;

export const LIST_DETAIL_METADATA_PARAMS = {
  expand: "owner,members",
  omit: "items",
} as const;

export const LIST_VIEWER_SOURCE_FIELDS =
  "title,original_title,tv_show_name,season_number,image_url,authors";
