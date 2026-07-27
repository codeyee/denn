import { User } from "./api";

export type GroupBy =
  | 'none'
  | 'context_status'
  | 'content_type'
  | 'date_added'
  | 'rating';

export type SortBy =
  | 'list_order'    // Default order
  | 'added_at'      // Date added
  | 'name'          // Alphabetical by content title
  | 'context_completed_at'  // Shared-list completion date
  | 'list_rating'   // List rating
  | 'added_by'      // User who added the item
  | 'content_type'; // Content type (Movie, TV Show, etc.)

export type SortOrder = 'asc' | 'desc';

export type PageSize = 10 | 20 | 50;

/**
 * Browse: paginated server data — default for viewing.
 * Reorder: full dataset loaded explicitly for drag-and-drop reordering.
 */
export type DataMode = 'browse' | 'reorder';

export interface ListViewPreferences {
  groupBy: GroupBy[]; // Composite grouping: up to 4 attributes
  sortBy: SortBy;
  sortOrder: SortOrder;
  pageSize: PageSize;
  currentPage: number;
}

export const DEFAULT_LIST_VIEW_PREFERENCES: ListViewPreferences = {
  groupBy: [], // No grouping by default
  sortBy: 'list_order',
  sortOrder: 'asc',
  pageSize: 20,
  currentPage: 1,
};

export const MAX_GROUPING_ATTRIBUTES = 4;

export interface GroupedItems<T> {
  groupKey: string;
  groupLabel: string;
  items: T[];
  count: number;
  groupAttributes: string[];
  subGroups?: GroupedItems<T>[];
}

export interface PaginatedResult<T> {
  items: T[];
  currentPage: number;
  pageSize: PageSize;
  totalItems: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
}

export interface MemberRating {
  user: User;
  score: string | number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  is_owner: boolean;
}

// ---------------------------------------------------------------------------
// Sprint 4.5: server-side query model
// ---------------------------------------------------------------------------

/**
 * Sort fields supported by the backend list-item query model.
 * Must stay in sync with `ALLOWED_SORTS` in
 * `core/content/services/list_item_query.py`.
 */
export type SortField =
  | 'list_order'
  | 'added_at'
  | 'context_completed_at'
  | 'context_status'
  | 'content_type'
  | 'list_rating'
  | 'display_title'
  | 'artist'
  | 'album_title'
  | 'release_date';

export type FilterField =
  | 'context_status'
  | 'content_type'
  | 'source_api'
  | 'added_by';

export type RangeFilterField =
  | 'list_rating_gte'
  | 'list_rating_lte'
  | 'added_at_gte'
  | 'added_at_lte'
  | 'context_completed_at_gte'
  | 'context_completed_at_lte'
  | 'release_date_gte'
  | 'release_date_lte';

export type GroupByField =
  | 'context_status'
  | 'content_type'
  | 'source_api'
  | 'added_by'
  | 'artist';

export interface SortClause {
  field: SortField;
  direction: SortOrder;
}

export type FilterValue = string | number | string[] | number[];

export interface ListItemQuery {
  filters: Partial<Record<FilterField, FilterValue>>;
  rangeFilters: Partial<Record<RangeFilterField, string | number>>;
  sort: SortClause[];
  groupBy: GroupByField | null;
  page: number;
  pageSize: PageSize;
}

export const DEFAULT_LIST_ITEM_QUERY: ListItemQuery = {
  filters: {},
  rangeFilters: {},
  sort: [],
  groupBy: null,
  page: 1,
  pageSize: 20,
};

export interface GroupHeader {
  key: string;
  label: string;
  countInPage: number;
  countGlobal: number;
}

export function isQueryEmpty(query: ListItemQuery): boolean {
  return (
    Object.keys(query.filters).length === 0 &&
    Object.keys(query.rangeFilters).length === 0 &&
    query.groupBy === null
  );
}
