"use client";

import Footer from "../../layout/Footer";
import FeaturedBanner from "./FeaturedBanner";
import FeaturedBannerPlaceholder from "./FeaturedBannerPlaceholder";
import { useHomeData } from "./hooks/useHomeData";
import { useFeaturedItems } from "./hooks/useFeaturedItems";
import { ErrorState } from "./components/ErrorState";
import { EmptyState } from "./components/EmptyState";
import { ContentCarousels } from "./components/ContentCarousels";

export default function HomePage() {
  const {
    suggestions,
    suggestionsLoading,
    suggestionsError,
    lists,
    listsLoading,
    listsError,
    createList,
    hasAnyError,
    isAllEmpty,
  } = useHomeData();

  const { featuredItems } = useFeaturedItems({
    movies: suggestions.movies,
    tvShows: suggestions.tvShows,
    games: suggestions.games,
    music: suggestions.music,
  });

  if (hasAnyError) {
    return (
      <ErrorState
        suggestionsError={suggestionsError}
        listsError={listsError}
      />
    );
  }

  return (
    <div className="relative w-full min-h-screen bg-background-logged-in">
      <div className="pt-30 pb-20">
        <section className="-mt-30 mb-6 md:mb-10 relative z-0">
          {suggestionsLoading || featuredItems.length === 0 ? (
            <FeaturedBannerPlaceholder />
          ) : (
            <FeaturedBanner items={featuredItems} />
          )}
        </section>

        <ContentCarousels
          suggestions={suggestions}
          lists={lists}
          suggestionsLoading={suggestionsLoading}
          listsLoading={listsLoading}
          createList={createList}
        />

        {isAllEmpty && <EmptyState />}

        <Footer />
      </div>

      <div className="pointer-events-none fixed left-0 right-0 bottom-0 h-16 bg-bottom-gradient z-10" />
    </div>
  );
}
