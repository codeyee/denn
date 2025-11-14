export const FEATURED_BANNER_CONFIG = {
  AUTO_ROTATE_MS: 5000,
  FEATURED_ITEMS_COUNT: 20,
  ITEMS_PER_CONTENT_TYPE: 4,
} as const;

export const CONTENT_SECTIONS = [
  { key: 'movies', title: 'Popular Movies' },
  { key: 'tvShows', title: 'Popular TV Shows' },
  { key: 'games', title: 'Popular Games' },
  { key: 'music', title: 'Popular Music' },
  { key: 'books', title: 'Popular Books' },
] as const;
