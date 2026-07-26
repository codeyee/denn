import { describe, expect, it } from "vitest";

import { pickRandomFavoriteBanner } from "@/components/pages/PublicProfilePage/utils";
import { ContentType, type PublicProfileOverview } from "@/lib/types";

const overview = {
  favorites: {
    [ContentType.MOVIE]: [
      {
        content: {
          id: 1,
          type: ContentType.MOVIE,
          title: "First",
          subtitle: null,
          date: null,
          poster: "https://example.com/first-poster.jpg",
          backdrop: "https://example.com/first-backdrop.jpg",
          authors: null,
        },
        favorited_at: null,
        score: "8.0",
      },
    ],
    [ContentType.GAME]: [
      {
        content: {
          id: 2,
          type: ContentType.GAME,
          title: "Second",
          subtitle: null,
          date: null,
          poster: "https://example.com/second-poster.jpg",
          backdrop: null,
          authors: null,
        },
        favorited_at: null,
        score: null,
      },
    ],
  },
  banner_media: [],
} as unknown as PublicProfileOverview;

describe("profile banner selection", () => {
  it("selects panoramic art and never falls back to a portrait cover", () => {
    expect(pickRandomFavoriteBanner(overview, () => 0)).toMatchObject({
      content_id: 1,
      image_url: "https://example.com/first-backdrop.jpg",
    });
    expect(pickRandomFavoriteBanner(overview, () => 0.99)).toMatchObject({
      content_id: 1,
      image_url: "https://example.com/first-backdrop.jpg",
    });
  });

  it("prefers the bounded banner payload produced by Core", () => {
    const fallback = {
      ...overview,
      banner_media: [
        {
          content_id: 3,
          type: ContentType.TV_SHOW,
          image_url: "https://example.com/fallback.jpg",
        },
      ],
    };

    expect(pickRandomFavoriteBanner(fallback, () => 0)).toEqual(
      fallback.banner_media[0],
    );
  });
});
