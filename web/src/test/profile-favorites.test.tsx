import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ContentType, type PublicFavorite } from "@/lib/types";

vi.mock(
  "@/components/pages/PublicProfilePage/ProfileCollections",
  () => ({
    FavoriteGrid: ({ items }: { items: PublicFavorite[] }) => (
      <ol aria-label="Visible favorites">
        {items.map((item) => (
          <li key={item.content.id}>{item.content.title}</li>
        ))}
      </ol>
    ),
  }),
);

import {
  ProfileFavorites,
  sortFavoritesByScore,
} from "@/components/pages/PublicProfilePage/ProfileFavorites";

const favorites = {
  [ContentType.MOVIE]: [
    favorite(1, ContentType.MOVIE, "Lower movie", "7.0", "2026-01-03"),
    favorite(2, ContentType.MOVIE, "Top movie", "9.0", "2026-01-02"),
  ],
  [ContentType.GAME]: [
    favorite(3, ContentType.GAME, "Top game", "9.0", "2026-01-04"),
  ],
  [ContentType.BOOK]: [
    favorite(4, ContentType.BOOK, "Unrated book", null, "2026-01-05"),
  ],
};

describe("profile favorites", () => {
  it("combines types and sorts by score, then favorite date", () => {
    expect(
      sortFavoritesByScore(Object.values(favorites).flat()).map(
        (item) => item.content.title,
      ),
    ).toEqual(["Top game", "Top movie", "Lower movie", "Unrated book"]);
  });

  it("supports an immediate multi-select union and restores all when cleared", async () => {
    const user = userEvent.setup();
    render(<ProfileFavorites favorites={favorites} />);

    expect(visibleFavoriteTitles()).toEqual([
      "Top game",
      "Top movie",
      "Lower movie",
      "Unrated book",
    ]);

    await user.click(screen.getByRole("button", { name: "Movies" }));
    expect(visibleFavoriteTitles()).toEqual(["Top movie", "Lower movie"]);

    await user.click(screen.getByRole("button", { name: "Games" }));
    expect(visibleFavoriteTitles()).toEqual([
      "Top game",
      "Top movie",
      "Lower movie",
    ]);

    await user.click(screen.getByRole("button", { name: "Movies" }));
    expect(visibleFavoriteTitles()).toEqual(["Top game"]);

    await user.click(screen.getByRole("button", { name: "Games" }));
    expect(visibleFavoriteTitles()).toEqual([
      "Top game",
      "Top movie",
      "Lower movie",
      "Unrated book",
    ]);
  });
});

function visibleFavoriteTitles() {
  return screen
    .getAllByRole("listitem")
    .map((item) => item.textContent);
}

function favorite(
  id: number,
  type: ContentType,
  title: string,
  score: string | null,
  favoritedAt: string,
): PublicFavorite {
  return {
    content: {
      id,
      type,
      title,
      subtitle: null,
      date: null,
      poster: null,
      backdrop: null,
      authors: null,
      season_number: null,
    },
    score,
    favorited_at: favoritedAt,
  };
}
