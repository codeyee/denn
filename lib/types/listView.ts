import { User } from "./api";

export type GroupBy =
  | 'none'
  | 'status'
  | 'content_type'
  | 'date_added'
  | 'rating';

export type SortBy =
  | 'list_order'    // Default order
  | 'added_at'      // Date added
  | 'name'          // Alphabetical by content title
  | 'completed_at'  // Completion date
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
