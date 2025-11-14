import { useMemo } from "react";
import { Content } from "@/types";

const FEATURED_ITEMS_COUNT = 20;
const  ITEMS_PER_CONTENT_TYPE = 4;

interface UseFeaturedItemsParams {
  movies: Content[];
  tvShows: Content[];
  games: Content[];
  music: Content[];
}

export function useFeaturedItems({ movies, tvShows, games, music }: UseFeaturedItemsParams) {
  const featuredItems = useMemo(() => {
    const pool: Content[] = [
      ...pickRandom(movies || [], ITEMS_PER_CONTENT_TYPE),
      ...pickRandom(tvShows || [], ITEMS_PER_CONTENT_TYPE),
      ...pickRandom(games || [], ITEMS_PER_CONTENT_TYPE),
      ...pickRandom(music || [], ITEMS_PER_CONTENT_TYPE),
    ];

    const shuffled = shuffleArray(pool);
    return shuffled.slice(0, FEATURED_ITEMS_COUNT);
  }, [movies, tvShows, games, music]);

  return { featuredItems };
}

function pickRandom<T>(arr: T[], n: number): T[] {
  const available = arr.slice();
  const result: T[] = [];
  const max = Math.min(n, available.length);

  while (result.length < max) {
    const idx = Math.floor(Math.random() * available.length);
    result.push(available[idx]);
    available.splice(idx, 1);
  }

  return result;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = array.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
