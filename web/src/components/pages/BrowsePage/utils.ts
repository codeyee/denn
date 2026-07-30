import type { BrowseType, Content } from "@/lib/types";
import {
  transformBookResults,
  transformGameResults,
  transformMovieResults,
  transformMusicResults,
  transformTVShowResults,
} from "../SearchPage/utils";
import type { SearchItem } from "@/lib/types";

export function transformBrowseResults(
  type: BrowseType,
  results: SearchItem[],
): Content[] {
  switch (type) {
    case "movies":
      return transformMovieResults(results);
    case "tv-shows":
      return transformTVShowResults(results);
    case "games":
      return transformGameResults(results);
    case "music":
      return transformMusicResults(results);
    case "books":
      return transformBookResults(results);
  }
}
