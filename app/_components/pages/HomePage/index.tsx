"use client";

import { useEffect } from "react";
import ContentCard from "../../Card/ContentCard";
import ListCard from "../../Card/ListCard";
import { useContentStore } from "@/app/_stores/content-store";
import { useListsStore } from "@/app/_stores/lists-store";

export default function HomePage() {
  const {
    suggestions,
    isLoading: suggestionsLoading,
    error: suggestionsError,
    fetchSuggestions,
  } = useContentStore();

  const {
    lists,
    isLoading: listsLoading,
    error: listsError,
    fetchLists,
    fetchListItems,
  } = useListsStore();

  useEffect(() => {
    fetchSuggestions(20);
    fetchLists();
  }, [fetchSuggestions, fetchLists]);

  useEffect(() => {
    if (lists.length > 0) {
      lists.forEach((list) => {
        if (!list.items) {
          fetchListItems(list.id, 4);
        }
      });
    }
  }, [lists, fetchListItems]);

  const isLoadingAny = suggestionsLoading || listsLoading;
  const hasAnyError = suggestionsError || listsError;

  if (isLoadingAny) {
    return (
      <div className="relative w-full min-h-screen bg-[#12040fff]">
        <div className="container mx-auto px-4 py-20">
          <div className="flex items-center justify-center min-h-[400px]">
            <p className="text-white text-xl">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (hasAnyError) {
    return (
      <div className="relative w-full min-h-screen bg-[#12040fff]">
        <div className="container mx-auto px-4 py-20">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-red-400 text-xl mb-4">Error loading data</p>
              {suggestionsError && (
                <p className="text-gray-400 mb-2">
                  Content:{' '}
                  {typeof suggestionsError === 'string'
                    ? suggestionsError
                    : (suggestionsError && typeof (suggestionsError as any).message === 'string')
                      ? (suggestionsError as any).message
                      : 'Unknown error'}
                </p>
              )}
              {listsError && (
                <p className="text-gray-400 mb-2">
                  Lists: {typeof listsError === 'string'
                    ? listsError
                    : (listsError && typeof (listsError as any).message === 'string')
                      ? (listsError as any).message
                      : 'Unknown error'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen bg-[#12040fff]">
      <div className="container mx-auto px-4 py-30">
        {/* Lists Section */}
        {lists.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Your Lists</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {lists.map((list) => (
                <ListCard key={`list-${list.id}`} list={list} />
              ))}
            </div>
          </section>
        )}

        {/* Movies Section */}
        {suggestions.movies.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Movies</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {suggestions.movies.map((movie) => (
                <ContentCard key={`movie-${movie.id}`} item={movie} />
              ))}
            </div>
          </section>
        )}

        {/* TV Shows Section */}
        {suggestions.tvShows.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">TV Shows</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {suggestions.tvShows.map((show) => (
                <ContentCard key={`tv-${show.id}`} item={show} />
              ))}
            </div>
          </section>
        )}

        {/* Games Section */}
        {suggestions.games.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Games</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {suggestions.games.map((game) => (
                <ContentCard key={`game-${game.id}`} item={game} />
              ))}
            </div>
          </section>
        )}

        {/* Music Section */}
        {suggestions.music.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Music</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {suggestions.music.map((album) => (
                <ContentCard key={`music-${album.id}`} item={album} />
              ))}
            </div>
          </section>
        )}

        {/* Books Section */}
        {suggestions.books.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Books</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {suggestions.books.map((book) => (
                <ContentCard key={`book-${book.id}`} item={book} />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {suggestions.movies.length === 0 &&
          suggestions.tvShows.length === 0 &&
          suggestions.games.length === 0 &&
          suggestions.music.length === 0 &&
          suggestions.books.length === 0 && (
            <div className="flex items-center justify-center min-h-[400px]">
              <p className="text-gray-400 text-lg">No suggestions available at the moment</p>
            </div>
          )}
      </div>
    </div>
  );
}
