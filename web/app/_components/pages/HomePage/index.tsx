"use client";

import { useMemo, useState } from "react";
import { Footer } from "../../layout/Footer";
import { FeaturedBanner } from "./FeaturedBanner";
import { FeaturedBannerPlaceholder } from "./FeaturedBannerPlaceholder";
import { useFeaturedItems } from "./hooks/useFeaturedItems";
import { ErrorState } from "../../common/state/ErrorState";
import { EmptyState } from "../../common/state/EmptyState";
import { ContentCarousels } from "./components/ContentCarousels";
import { listActions } from "@/lib/api";
import { ListType, type HomepageResponse, type ListWithItems } from "@/lib/types";

interface HomePageProps {
  initialSuggestions: HomepageResponse | null;
  initialSuggestionsError: string | null;
  initialLists: ListWithItems[];
  initialListsError: string | null;
}

export function HomePage({
  initialSuggestions,
  initialSuggestionsError,
  initialLists,
  initialListsError,
}: HomePageProps) {
  const [lists, setLists] = useState(initialLists);
  const [listsError, setListsError] = useState<string | null>(initialListsError);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const suggestions = useMemo(
    () => ({
      movies: initialSuggestions?.movies?.results ?? [],
      tvShows: initialSuggestions?.["tv-shows"]?.results ?? [],
      games: initialSuggestions?.games?.results ?? [],
      music: initialSuggestions?.albums?.results ?? [],
      books: initialSuggestions?.books?.results ?? [],
    }),
    [initialSuggestions]
  );

  const { featuredItems } = useFeaturedItems({
    movies: suggestions.movies,
    tvShows: suggestions.tvShows,
    games: suggestions.games,
    music: suggestions.music,
  });

  const isAllEmpty =
    !initialSuggestionsError &&
    !listsError &&
    suggestions.movies.length === 0 &&
    suggestions.tvShows.length === 0 &&
    suggestions.games.length === 0 &&
    suggestions.music.length === 0 &&
    suggestions.books.length === 0 &&
    lists.length === 0;

  const handleCreateList = async (
    name: string,
    description?: string,
    listType?: ListType
  ) => {
    setIsCreatingList(true);
    setListsError(null);

    try {
      const createdList = await listActions.create({
        name,
        description: description || null,
        list_type: listType ?? ListType.PERSONAL,
      });

      setLists((currentLists) => [createdList as ListWithItems, ...currentLists]);
    } catch (error) {
      setListsError(
        error instanceof Error ? error.message : "Failed to create list"
      );
      throw error;
    } finally {
      setIsCreatingList(false);
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-background-logged-in">
      <div className="pt-30 pb-20">
        <section className="-mt-30 mb-6 md:mb-10 relative z-0">
          {initialSuggestionsError || featuredItems.length === 0
            ? <FeaturedBannerPlaceholder />
            : <FeaturedBanner items={featuredItems} />
          }
        </section>

        {initialSuggestionsError && (
          <ErrorState
            error={initialSuggestionsError}
            title="Could not load homepage suggestions"
          />
        )}

        <ContentCarousels
          suggestions={suggestions}
          lists={lists}
          suggestionsError={initialSuggestionsError}
          listsError={listsError}
          createList={handleCreateList}
          isCreatingList={isCreatingList}
        />

        {isAllEmpty && <EmptyState />}

        <Footer />
      </div>

      <div className="pointer-events-none fixed left-0 right-0 bottom-0 h-16 bg-bottom-gradient z-10" />
    </div>
  );
}
