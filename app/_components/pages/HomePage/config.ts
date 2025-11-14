export const CAROUSEL_CONFIG = {
  ITEMS_PER_CAROUSEL: undefined,
  ITEM_TARGET_WIDTH: 250,
  PLACEHOLDER_COUNT: 10,
} as const;

export const FEATURED_BANNER_CONFIG = {
  AUTO_ROTATE_MS: 6000,
  FEATURED_ITEMS_COUNT: 10,
  ITEMS_PER_CONTENT_TYPE: 3,
} as const;

export const CONTENT_SECTIONS = [
  { key: 'movies', title: 'Popular Movies' },
  { key: 'tvShows', title: 'Popular TV Shows' },
  { key: 'games', title: 'Popular Games' },
  { key: 'music', title: 'Popular Music' },
  { key: 'books', title: 'Popular Books' },
] as const;
