import { useEffect, useMemo, useState } from "react";
import { Content } from "@/lib/types";

const FEATURED_ITEMS_COUNT = 20;
const ITEMS_PER_CONTENT_TYPE = 4;

interface UseFeaturedItemsParams {
  movies: Content[];
  tvShows: Content[];
  games: Content[];
  music: Content[];
}

export function useFeaturedItems({ movies, tvShows, games, music }: UseFeaturedItemsParams) {
  // Random selection runs only after mount to avoid SSR/CSR hydration mismatches.
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const deterministicItems = useMemo(() => {
    const pool: Content[] = [
      ...(movies || []).slice(0, ITEMS_PER_CONTENT_TYPE),
      ...(tvShows || []).slice(0, ITEMS_PER_CONTENT_TYPE),
      ...(games || []).slice(0, ITEMS_PER_CONTENT_TYPE),
      ...(music || []).slice(0, ITEMS_PER_CONTENT_TYPE),
    ];
    return pool.slice(0, FEATURED_ITEMS_COUNT);
  }, [movies, tvShows, games, music]);

  const randomizedItems = useMemo(() => {
    const pool: Content[] = [
      ...pickRandom(movies || [], ITEMS_PER_CONTENT_TYPE),
      ...pickRandom(tvShows || [], ITEMS_PER_CONTENT_TYPE),
      ...pickRandom(games || [], ITEMS_PER_CONTENT_TYPE),
      ...pickRandom(music || [], ITEMS_PER_CONTENT_TYPE),
    ];
    return shuffleArray(pool).slice(0, FEATURED_ITEMS_COUNT);
  }, [movies, tvShows, games, music]);

  const featuredItems = isMounted ? randomizedItems : deterministicItems;

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
