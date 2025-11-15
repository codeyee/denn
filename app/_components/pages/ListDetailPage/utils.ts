import { ListItem, SourceData } from '@/types';
import { ContentType, ItemStatus } from '@/lib/api/types';
import {
  GroupBy,
  SortBy,
  SortOrder,
  PageSize,
  GroupedItems,
  PaginatedResult,
  ListViewPreferences,
  DEFAULT_LIST_VIEW_PREFERENCES,
} from '@/types/listView';

export function getItemTitle(item: ListItem): string {
  const sourceData = item.content_item.source_data as SourceData;
  return sourceData.title || sourceData.name || 'Untitled';
}

export function getContentTypeLabel(contentType: ContentType): string {
  const labels: Record<ContentType, string> = {
    [ContentType.MOVIE]: 'Movies',
    [ContentType.TV_SHOW]: 'TV Shows',
    [ContentType.SEASON]: 'Seasons',
    [ContentType.GAME]: 'Games',
    [ContentType.ALBUM]: 'Albums',
    [ContentType.BOOK]: 'Books',
    [ContentType.PERSON]: 'People',
  };
  return labels[contentType] || contentType;
}

export function getStatusLabel(status: ItemStatus): string {
  return status === ItemStatus.COMPLETED ? 'Completed' : 'Pending';
}

export function getRatingRangeLabel(rating: number | null): string {
  if (rating === null) return 'Unrated';
  if (rating >= 4.5) return '5 Stars';
  if (rating >= 3) return '3-4 Stars';
  return '1-2 Stars';
}

export function getDateAddedLabel(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function groupItemsByCriterion(
  items: ListItem[],
  groupBy: GroupBy
): GroupedItems<ListItem>[] {
  if (groupBy === 'none') {
    return [{
      groupKey: 'all',
      groupLabel: 'All Items',
      items,
      count: items.length,
      groupAttributes: [],
    }];
  }

  const groups: Map<string, ListItem[]> = new Map();

  items.forEach((item) => {
    let groupKey: string;

    switch (groupBy) {
      case 'status':
        groupKey = item.status;
        break;

      case 'content_type':
        groupKey = item.content_item.content_type;
        break;

      case 'date_added':
        groupKey = getDateAddedLabel(item.added_at);
        break;

      case 'rating':
        groupKey = getRatingRangeLabel(item.list_rating);
        break;

      default:
        groupKey = 'unknown';
    }

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(item);
  });

  // Convert map to array and sort groups
  const result: GroupedItems<ListItem>[] = Array.from(groups.entries()).map(
    ([groupKey, items]) => ({
      groupKey,
      groupLabel: groupKey,
      items,
      count: items.length,
      groupAttributes: [],
    })
  );

  // Sort groups by a logical order
  return sortGroups(result, groupBy);
}

function sortGroups(
  groups: GroupedItems<ListItem>[],
  groupBy: GroupBy
): GroupedItems<ListItem>[] {
  switch (groupBy) {
    case 'status':
      // Pending first, then Completed
      return groups.sort((a, b) => {
        if (a.groupKey === ItemStatus.PENDING) return -1;
        if (b.groupKey === ItemStatus.PENDING) return 1;
        return 0;
      });

    case 'content_type':
      // Alphabetical
      return groups.sort((a, b) => a.groupLabel.localeCompare(b.groupLabel));

    case 'date_added':
      // Most recent first
      return groups.sort((a, b) => b.groupLabel.localeCompare(a.groupLabel));

    case 'rating':
      // 5 stars → 3-4 stars → 1-2 stars → Unrated
      const ratingOrder = ['5 Stars', '3-4 Stars', '1-2 Stars', 'Unrated'];
      return groups.sort((a, b) => {
        const indexA = ratingOrder.indexOf(a.groupKey);
        const indexB = ratingOrder.indexOf(b.groupKey);
        return indexA - indexB;
      });

    default:
      return groups;
  }
}

/**
 * Groups items by composite attributes (e.g., "MOVIE - 5 Stars - COMPLETED")
 * @param items - Items to group
 * @param groupByAttrs - Array of GroupBy attributes (max 4)
 * @returns Grouped items with composite keys
 */
export function groupItemsComposite(
  items: ListItem[],
  groupByAttrs: GroupBy[]
): GroupedItems<ListItem>[] {
  // No grouping
  if (groupByAttrs.length === 0 || (groupByAttrs.length === 1 && groupByAttrs[0] === 'none')) {
    return [{
      groupKey: 'all',
      groupLabel: 'All Items',
      items,
      count: items.length,
      groupAttributes: [],
    }];
  }

  // Filter out 'none' values
  const validAttrs = groupByAttrs.filter(attr => attr !== 'none');
  if (validAttrs.length === 0) {
    return [{
      groupKey: 'all',
      groupLabel: 'All Items',
      items,
      count: items.length,
      groupAttributes: [],
    }];
  }

  // Build composite groups
  const groups: Map<string, { items: ListItem[]; attributes: string[] }> = new Map();

  items.forEach((item) => {
    const attributes: string[] = [];
    const labels: string[] = [];

    validAttrs.forEach((groupBy) => {
      let value: string;
      let label: string;

      switch (groupBy) {
        case 'status':
          value = item.status;
          label = getStatusLabel(item.status);
          break;

        case 'content_type':
          value = item.content_item.content_type;
          label = getContentTypeLabel(item.content_item.content_type);
          break;

        case 'date_added':
          value = getDateAddedLabel(item.added_at);
          label = value;
          break;

        case 'rating':
          value = getRatingRangeLabel(item.list_rating);
          label = value;
          break;

        default:
          value = 'unknown';
          label = 'Unknown';
      }

      attributes.push(value);
      labels.push(label);
    });

    // Create composite key and label
    const groupKey = attributes.join(' - ');

    if (!groups.has(groupKey)) {
      groups.set(groupKey, { items: [], attributes });
    }
    groups.get(groupKey)!.items.push(item);
  });

  // Convert to array
  const result: GroupedItems<ListItem>[] = Array.from(groups.entries()).map(
    ([groupKey, { items, attributes }]) => ({
      groupKey,
      groupLabel: groupKey,
      items,
      count: items.length,
      groupAttributes: attributes,
    })
  );

  // Sort groups alphabetically by key
  return result.sort((a, b) => a.groupKey.localeCompare(b.groupKey));
}

// Legacy function for backwards compatibility
export function groupItems(
  items: ListItem[],
  primaryGroup: GroupBy,
  secondaryGroup: GroupBy
): GroupedItems<ListItem>[] {
  // Convert to composite grouping
  const groupBy = [primaryGroup, secondaryGroup].filter(g => g !== 'none');
  return groupItemsComposite(items, groupBy);
}

export function sortItems(
  items: ListItem[],
  sortBy: SortBy,
  sortOrder: SortOrder
): ListItem[] {
  const sorted = [...items].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'list_order':
        comparison = a.list_order - b.list_order;
        break;

      case 'added_at':
        comparison = new Date(a.added_at).getTime() - new Date(b.added_at).getTime();
        break;

      case 'name':
        comparison = getItemTitle(a).localeCompare(getItemTitle(b));
        break;

      case 'completed_at':
        // Handle nulls: nulls go to the end
        if (a.completed_at === null && b.completed_at === null) comparison = 0;
        else if (a.completed_at === null) comparison = 1;
        else if (b.completed_at === null) comparison = -1;
        else comparison = new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime();
        break;

      case 'list_rating':
        // Handle nulls: nulls go to the end
        if (a.list_rating === null && b.list_rating === null) comparison = 0;
        else if (a.list_rating === null) comparison = 1;
        else if (b.list_rating === null) comparison = -1;
        else comparison = a.list_rating - b.list_rating;
        break;

      case 'added_by':
        comparison = a.added_by.username.localeCompare(b.added_by.username);
        break;

      case 'content_type':
        comparison = a.content_item.content_type.localeCompare(
          b.content_item.content_type
        );
        break;

      default:
        comparison = 0;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return sorted;
}

export function sortGroupedItems(
  groups: GroupedItems<ListItem>[],
  sortBy: SortBy,
  sortOrder: SortOrder
): GroupedItems<ListItem>[] {
  return groups.map((group) => ({
    ...group,
    items: sortItems(group.items, sortBy, sortOrder),
    subGroups: group.subGroups
      ? sortGroupedItems(group.subGroups, sortBy, sortOrder)
      : undefined,
  }));
}

export function flattenGroups(groups: GroupedItems<ListItem>[]): ListItem[] {
  return groups.flatMap((group) => {
    if (group.subGroups) {
      return flattenGroups(group.subGroups);
    }
    return group.items;
  });
}

export function paginateItems(
  items: ListItem[],
  currentPage: number,
  pageSize: PageSize
): PaginatedResult<ListItem> {
  const totalItems = items.length;

  // Handle 'all' case - show all items without pagination
  if (pageSize === 'all') {
    return {
      items: items,
      currentPage: 1,
      pageSize: 'all',
      totalItems,
      totalPages: 1,
      startIndex: 0,
      endIndex: totalItems,
    };
  }

  const numericPageSize = pageSize as number;
  const totalPages = Math.ceil(totalItems / numericPageSize);
  const validPage = Math.max(1, Math.min(currentPage, totalPages || 1));

  const startIndex = (validPage - 1) * numericPageSize;
  const endIndex = Math.min(startIndex + numericPageSize, totalItems);
  const paginatedItems = items.slice(startIndex, endIndex);

  return {
    items: paginatedItems,
    currentPage: validPage,
    pageSize: numericPageSize as PageSize,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
  };
}

export function paginateGroup(
  group: GroupedItems<ListItem>,
  groupPage: number,
  pageSize: PageSize
): {
  paginatedItems: ListItem[];
  totalPages: number;
  startIndex: number;
  endIndex: number;
} {
  const allItems = group.subGroups
    ? group.subGroups.flatMap(sg => sg.items)
    : group.items;

  const totalItems = allItems.length;

  // Handle 'all' case
  if (pageSize === 'all') {
    return {
      paginatedItems: allItems,
      totalPages: 1,
      startIndex: 0,
      endIndex: totalItems,
    };
  }

  const numericPageSize = pageSize as number;
  const totalPages = Math.max(1, Math.ceil(totalItems / numericPageSize));
  const validPage = Math.max(1, Math.min(groupPage, totalPages));

  const startIndex = (validPage - 1) * numericPageSize;
  const endIndex = Math.min(startIndex + numericPageSize, totalItems);

  return {
    paginatedItems: allItems.slice(startIndex, endIndex),
    totalPages,
    startIndex,
    endIndex,
  };
}

export function paginateSubGroup(
  subGroup: GroupedItems<ListItem>,
  subGroupPage: number,
  pageSize: PageSize
): {
  paginatedItems: ListItem[];
  totalPages: number;
  startIndex: number;
  endIndex: number;
} {
  const totalItems = subGroup.items.length;

  // Handle 'all' case
  if (pageSize === 'all') {
    return {
      paginatedItems: subGroup.items,
      totalPages: 1,
      startIndex: 0,
      endIndex: totalItems,
    };
  }

  const numericPageSize = pageSize as number;
  const totalPages = Math.max(1, Math.ceil(totalItems / numericPageSize));
  const validPage = Math.max(1, Math.min(subGroupPage, totalPages));

  const startIndex = (validPage - 1) * numericPageSize;
  const endIndex = Math.min(startIndex + numericPageSize, totalItems);

  return {
    paginatedItems: subGroup.items.slice(startIndex, endIndex),
    totalPages,
    startIndex,
    endIndex,
  };
}

export function paginateSubGroups(
    subGroups: GroupedItems<ListItem>[],
    subGroupPage: number,
    pageSize: PageSize
  ): {
    paginatedSubGroups: GroupedItems<ListItem>[];
    totalPages: number;
    startIndex: number;
    endIndex: number;
  } {
    const totalItems = subGroups.length;

    // Handle 'all' case
    if (pageSize === 'all') {
      return {
        paginatedSubGroups: subGroups,
        totalPages: 1,
        startIndex: 0,
        endIndex: totalItems,
      };
    }

    const numericPageSize = pageSize as number;
    const totalPages = Math.max(1, Math.ceil(totalItems / numericPageSize));
    const validPage = Math.max(1, Math.min(subGroupPage, totalPages));

    const startIndex = (validPage - 1) * numericPageSize;
    const endIndex = Math.min(startIndex + numericPageSize, totalItems);

    return {
      paginatedSubGroups: subGroups.slice(startIndex, endIndex),
      totalPages,
      startIndex,
      endIndex,
    };
  }

export function paginateGroupedItems(
  groups: GroupedItems<ListItem>[],
  currentPage: number,
  pageSize: PageSize
): PaginatedResult<GroupedItems<ListItem>> {
  // Get all items from all groups
  const allItems = flattenGroups(groups);
  const totalItems = allItems.length;

  // Handle 'all' case - show all groups without pagination
  if (pageSize === 'all') {
    return {
      items: groups,
      currentPage: 1,
      pageSize: 'all',
      totalItems,
      totalPages: 1,
      startIndex: 0,
      endIndex: totalItems,
    };
  }

  const numericPageSize = pageSize as number;
  const totalPages = Math.ceil(totalItems / numericPageSize);
  const validPage = Math.max(1, Math.min(currentPage, totalPages || 1));

  const startIndex = (validPage - 1) * numericPageSize;
  const endIndex = Math.min(startIndex + numericPageSize, totalItems);

  // For grouped items, we don't paginate across groups
  // Instead, each group maintains its own pagination
  // This function just returns metadata for the overall list
  return {
    items: groups,
    currentPage: validPage,
    pageSize: numericPageSize as PageSize,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
  };
}

function getPreferencesKey(listId: number): string {
  return `list-view-preferences-${listId}`;
}

export function loadPreferences(listId: number): ListViewPreferences {
  try {
    const stored = localStorage.getItem(getPreferencesKey(listId));
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_LIST_VIEW_PREFERENCES, ...parsed };
    }
  } catch (error) {
    console.error('Failed to load list view preferences:', error);
  }
  return { ...DEFAULT_LIST_VIEW_PREFERENCES };
}

export function savePreferences(
  listId: number,
  preferences: ListViewPreferences
): void {
  try {
    localStorage.setItem(getPreferencesKey(listId), JSON.stringify(preferences));
  } catch (error) {
    console.error('Failed to save list view preferences:', error);
  }
}
