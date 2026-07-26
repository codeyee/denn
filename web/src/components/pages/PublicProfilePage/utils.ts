import {
  ContentType,
  AuthorType,
  ListType,
  type Content,
  type LocalContentSummary,
  type ProfileBannerMedia,
  type PublicListSummary,
  type PublicProfileOverview,
} from "@/lib/types";
import type { ListCardData } from "@/components/common/cards/ListCard";

export function profileContentCardItem(item: LocalContentSummary): Content {
  const base = {
    id: String(item.id),
    denn_id: item.id,
    title: item.title,
    image_url: item.poster,
    release_date: item.date,
    images: [],
  };

  switch (item.type) {
    case ContentType.TV_SHOW:
      return {
        ...base,
        type: "TV_SHOW",
        original_title: item.title,
        description: null,
        tagline: null,
        imdb_id: null,
        status: null,
        number_of_seasons: null,
        number_of_episodes: null,
        authors: null,
        platforms: null,
        seasons: [],
      };
    case ContentType.SEASON:
      return {
        ...base,
        type: "SEASON",
        season_number: 0,
        description: null,
        tv_show_name: item.subtitle,
        number_of_episodes: 0,
        platforms: null,
        episodes: [],
      };
    case ContentType.GAME:
      return {
        ...base,
        type: "GAME",
        game_type: null,
        description: null,
        authors: null,
        platforms: null,
        genres: [],
        themes: [],
        game_modes: [],
        series: null,
        play_time: null,
      };
    case ContentType.ALBUM:
      return {
        ...base,
        type: "ALBUM",
        authors: item.subtitle
          ? [{ name: item.subtitle, type: AuthorType.PERSON }]
          : null,
        total_tracks: 0,
        album_type: "",
        external_url: "",
        tracks: [],
        duration_minutes: null,
      };
    case ContentType.BOOK:
      return {
        ...base,
        type: "BOOK",
        authors: item.subtitle
          ? [{ name: item.subtitle, type: AuthorType.PERSON }]
          : null,
        pages: null,
        description: null,
      };
    case ContentType.MOVIE:
    default:
      return {
        ...base,
        type: "MOVIE",
        original_title: item.title,
        description: null,
        tagline: null,
        imdb_id: null,
        duration_minutes: null,
        status: null,
        authors: null,
        platforms: null,
      };
  }
}

export function profileListCardItem(list: PublicListSummary): ListCardData {
  return {
    id: list.id,
    name: list.name,
    list_type: list.list_type ?? ListType.PERSONAL,
    visibility: list.visibility,
    item_count: list.item_count,
  };
}

export function pickRandomFavoriteBanner(
  overview: PublicProfileOverview,
  random: () => number = Math.random,
): ProfileBannerMedia | undefined {
  const favoriteMedia = Object.values(overview.favorites)
    .flatMap((items) => items ?? [])
    .flatMap(({ content }) => {
      const imageUrl = content.backdrop ?? content.poster;
      return imageUrl
        ? [{
            content_id: content.id,
            type: content.type,
            image_url: imageUrl,
          }]
        : [];
    });
  const uniqueFavoriteMedia = Array.from(
    new Map(
      favoriteMedia.map((item) => [
        `${item.content_id}:${item.image_url}`,
        item,
      ]),
    ).values(),
  );
  const candidates =
    uniqueFavoriteMedia.length > 0
      ? uniqueFavoriteMedia
      : overview.banner_media;

  if (candidates.length === 0) return undefined;

  const index = Math.min(
    Math.floor(random() * candidates.length),
    candidates.length - 1,
  );
  return candidates[index];
}

export function formatJoinedAt(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function formatProfileDate(value: string | null) {
  if (!value) return "Date unavailable";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}
