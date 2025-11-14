export type GroupBy =
  | 'none'
  | 'status'
  | 'content_type'
  | 'date_added'
  | 'rating';

export type SortBy =
  | 'list_order'      // Default order
  | 'added_at'        // Date added
  | 'name'            // Alphabetical by content title
  | 'completed_at'    // Completion date
  | 'list_rating'     // List rating
  | 'added_by'        // User who added the item
  | 'content_type';   // Content type (Movie, TV Show, etc.)

export type SortOrder = 'asc' | 'desc';

export type PageSize = 10 | 20 | 50 | 'all';

export interface ListViewPreferences {
  primaryGroup: GroupBy;
  secondaryGroup: GroupBy;
  sortBy: SortBy;
  sortOrder: SortOrder;
  pageSize: PageSize;
  currentPage: number;
}

export const DEFAULT_LIST_VIEW_PREFERENCES: ListViewPreferences = {
  primaryGroup: 'none',
  secondaryGroup: 'none',
  sortBy: 'list_order',
  sortOrder: 'asc',
  pageSize: 20,
  currentPage: 1,
};

export interface GroupedItems<T> {
  groupKey: string;
  groupLabel: string;
  items: T[];
  count: number;
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