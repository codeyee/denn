"use client";

import { useEffect } from "react";
import ContentCard from "../../Card/ContentCard";
import ListCard from "../../Card/ListCard";
import Carousel from "../../Carousel";
import CreateListCard from "../../Card/CreateListCard";
import { useContentStore } from "@/app/_stores/content-store";
import { useListsStore } from "@/app/_stores/lists-store";

const ITEMS_PER_VIEW = 6;

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
    createList,
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
                  Content:{" "}
                  {typeof suggestionsError === "string"
                    ? suggestionsError
                    : suggestionsError &&
                      typeof (suggestionsError as any).message === "string"
                    ? (suggestionsError as any).message
                    : "Unknown error"}
                </p>
              )}
              {listsError && (
                <p className="text-gray-400 mb-2">
                  Lists:{" "}
                  {typeof listsError === "string"
                    ? listsError
                    : listsError &&
                      typeof (listsError as any).message === "string"
                    ? (listsError as any).message
                    : "Unknown error"}
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
      <div className="py-30">
        {/* Lists Section */}
        {(lists.length > 0 || !listsLoading) && (
          <section className="mb-16">
            <Carousel title="Your Lists" itemsPerView={ITEMS_PER_VIEW}>
              {[
                ...lists.map((list) => (
                  <ListCard key={`list-${list.id}`} list={list} />
                )),
                <CreateListCard
                  key="create-list"
                  onCreateList={createList}
                  isLoading={listsLoading}
                />,
              ]}
            </Carousel>
          </section>
        )}

        {/* Movies Section */}
        {suggestions.movies.length > 0 && (
          <section className="mb-16">
            <Carousel title="Popular Movies" itemsPerView={ITEMS_PER_VIEW}>
              {suggestions.movies.map((movie) => (
                <ContentCard key={`movie-${movie.id}`} item={movie} />
              ))}
            </Carousel>
          </section>
        )}

        {/* TV Shows Section */}
        {suggestions.tvShows.length > 0 && (
          <section className="mb-16">
            <Carousel title="Popular TV Shows" itemsPerView={ITEMS_PER_VIEW}>
              {suggestions.tvShows.map((show) => (
                <ContentCard key={`tv-${show.id}`} item={show} />
              ))}
            </Carousel>
          </section>
        )}

        {/* Games Section */}
        {suggestions.games.length > 0 && (
          <section className="mb-16">
            <Carousel title="Popular Games" itemsPerView={ITEMS_PER_VIEW}>
              {suggestions.games.map((game) => (
                <ContentCard key={`game-${game.id}`} item={game} />
              ))}
            </Carousel>
          </section>
        )}

        {/* Music Section */}
        {suggestions.music.length > 0 && (
          <section className="mb-16">
            <Carousel title="Popular Music" itemsPerView={ITEMS_PER_VIEW}>
              {suggestions.music.map((album) => (
                <ContentCard key={`music-${album.id}`} item={album} />
              ))}
            </Carousel>
          </section>
        )}

        {/* Books Section */}
        {suggestions.books.length > 0 && (
          <section className="mb-16">
            <Carousel title="Popular Books" itemsPerView={ITEMS_PER_VIEW}>
              {suggestions.books.map((book) => (
                <ContentCard key={`book-${book.id}`} item={book} />
              ))}
            </Carousel>
          </section>
        )}

        {/* Empty state */}
        {suggestions.movies.length === 0 &&
          suggestions.tvShows.length === 0 &&
          suggestions.games.length === 0 &&
          suggestions.music.length === 0 &&
          suggestions.books.length === 0 && (
            <div className="flex items-center justify-center min-h-[400px]">
              <p className="text-gray-400 text-lg">
                No suggestions available at the moment
              </p>
            </div>
          )}
      </div>
    </div>
  );
}
