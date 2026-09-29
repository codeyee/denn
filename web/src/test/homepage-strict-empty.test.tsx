import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HomePage } from "@/components/pages/HomePage";
import { useHomeData } from "@/components/pages/HomePage/hooks/useHomeData";
import type { BookDetail, MovieDetail } from "@/lib/types";

vi.mock("@/components/pages/HomePage/hooks/useHomeData", () => ({
  useHomeData: vi.fn(),
}));
vi.mock("@/components/layout/Footer", () => ({ Footer: () => null }));
vi.mock("@/components/pages/HomePage/FeaturedBanner", () => ({
  FeaturedBanner: ({ items }: { items: unknown[] }) => (
    <div data-testid="featured-banner">{items.length}</div>
  ),
}));
vi.mock("@/components/pages/HomePage/components/ContentCarousels", () => ({
  ContentCarousels: () => <div data-testid="carousels" />,
}));

const mockedUseHomeData = vi.mocked(useHomeData);

describe("strict homepage with thin or empty categories", () => {
  beforeEach(() => {
    mockedUseHomeData.mockReset();
  });

  it("renders no banner and no skeleton once an empty homepage has settled", () => {
    mockedUseHomeData.mockReturnValue(homeData({ isAllEmpty: true }));

    const { container } = renderHome();

    expect(screen.queryByTestId("featured-banner")).not.toBeInTheDocument();
    expect(container.querySelector(".animate-glare")).toBeNull();
    expect(screen.getByText("No suggestions available at the moment")).toBeInTheDocument();
  });

  it("keeps the skeleton while suggestions are still loading", () => {
    mockedUseHomeData.mockReturnValue(homeData({ suggestionsLoading: true }));

    const { container } = renderHome();

    expect(container.querySelector(".animate-glare")).not.toBeNull();
    expect(screen.queryByTestId("featured-banner")).not.toBeInTheDocument();
  });

  it("keeps the skeleton and error state when suggestions failed", () => {
    mockedUseHomeData.mockReturnValue(homeData({
      suggestionsError: "Upstream unavailable",
      suggestions: { movies: [movie("safe")], tvShows: [], games: [], music: [], books: [] },
    }));

    const { container } = renderHome();

    expect(container.querySelector(".animate-glare")).not.toBeNull();
    expect(screen.queryByTestId("featured-banner")).not.toBeInTheDocument();
    expect(screen.getByText("Could not load homepage suggestions")).toBeInTheDocument();
  });

  it("features only the items that remain", () => {
    mockedUseHomeData.mockReturnValue(homeData({
      suggestions: { movies: [movie("safe")], tvShows: [], games: [], music: [], books: [] },
    }));

    const { container } = renderHome();

    expect(screen.getByTestId("featured-banner")).toHaveTextContent("1");
    expect(container.querySelector(".animate-glare")).toBeNull();
  });

  it("shows carousels without a banner when only unfeatured categories remain", () => {
    mockedUseHomeData.mockReturnValue(homeData({
      suggestions: { movies: [], tvShows: [], games: [], music: [], books: [book("book")] },
    }));

    const { container } = renderHome();

    expect(screen.queryByTestId("featured-banner")).not.toBeInTheDocument();
    expect(container.querySelector(".animate-glare")).toBeNull();
    expect(screen.getByTestId("carousels")).toBeInTheDocument();
  });
});

function renderHome() {
  return render(<HomePage moderationVisibilityEnabled isAuthenticated={false} />);
}

function homeData(
  overrides: Partial<ReturnType<typeof useHomeData>> = {},
): ReturnType<typeof useHomeData> {
  return {
    suggestions: { movies: [], tvShows: [], games: [], music: [], books: [] },
    suggestionsLoading: false,
    suggestionsError: null,
    lists: [],
    listsLoading: false,
    listsError: null,
    progress: [],
    progressLoading: false,
    progressError: null,
    createList: vi.fn(),
    isCreatingList: false,
    hasAnyError: false,
    isAllEmpty: false,
    ...overrides,
  };
}

function book(id: string): BookDetail {
  return {
    id,
    denn_id: 2,
    type: "BOOK",
    title: id,
    authors: null,
    image_url: null,
    release_date: null,
    pages: null,
    description: null,
    images: [],
  };
}

function movie(id: string): MovieDetail {
  return {
    id,
    denn_id: 1,
    type: "MOVIE",
    title: id,
    original_title: id,
    description: null,
    image_url: null,
    tagline: null,
    imdb_id: null,
    release_date: null,
    duration_minutes: null,
    status: null,
    authors: null,
    images: [],
    platforms: null,
  };
}
