"use client";

import { useEffect, useMemo } from "react";
import ContentCard from "../../cards/ContentCard";
import PlaceholderCard from "../../cards/PlaceholderCard";
import ListCard from "../../cards/ListCard";
import Carousel from "../../common/Carousel";
import CreateListCard from "../../cards/CreateListCard";
import Footer from "../../layout/Footer";
import { useContentStore } from "@/app/_stores/content-store";
import { useListsStore } from "@/app/_stores/lists-store";
import FeaturedBanner from "./FeaturedBanner";
import FeaturedBannerPlaceholder from "./FeaturedBannerPlaceholder";
import { Content } from "@/types";

const ITEMS_PER_CAROUSEL = undefined;
const ITEM_TARGET_WIDTH = 250;
const PLACEHOLDER_COUNT = 10;

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
    createList,
  } = useListsStore();

  useEffect(() => {
    fetchSuggestions(20);
    fetchLists({
      items_size: 4,
    });
  }, [fetchSuggestions, fetchLists]);

  const hasAnyError = suggestionsError || listsError;

  const featuredItems = useMemo(() => {
    // Helper to pick up to n random items from a list
    const pickRandom = <T,>(arr: T[], n: number): T[] => {
      const available = arr.slice();
      const result: T[] = [];
      const max = Math.min(n, available.length);
      while (result.length < max) {
        const idx = Math.floor(Math.random() * available.length);
        result.push(available[idx]);
        available.splice(idx, 1);
      }
      return result;
    };

    const pool: Content[] = [
      ...pickRandom(suggestions.movies || [], 3),
      ...pickRandom(suggestions.tvShows || [], 3),
      ...pickRandom(suggestions.games || [], 3),
      ...pickRandom(suggestions.music || [], 3),
    ];

    // Shuffle and take up to 10
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 10);
  }, [
    suggestions.movies,
    suggestions.tvShows,
    suggestions.games,
    suggestions.music,
  ]);

  if (hasAnyError) {
    return (
      <div className="relative w-full min-h-screen bg-background-logged-in">
        <div className="container mx-auto px-4 mt-8 py-20">
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
    <div className="relative w-full min-h-screen bg-background-logged-in">
      <div className="pt-30 pb-20">
        {/* Featured Banner */}
        <section className="-mt-30 mb-6 md:mb-10 relative z-0">
          {suggestionsLoading || featuredItems.length === 0 ? (
            <FeaturedBannerPlaceholder />
          ) : (
            <FeaturedBanner items={featuredItems} />
          )}
        </section>

        {/* Lists Section */}
        {listsLoading ? (
          <section className="mb-4 md:mb-8">
            <Carousel
              title="Your Lists"
              itemsPerView={ITEMS_PER_CAROUSEL}
              targetCardWidth={ITEM_TARGET_WIDTH}
              disableNavigation
            >
              {Array.from({ length: PLACEHOLDER_COUNT }).map((_, index) => (
                <PlaceholderCard
                  key={`list-placeholder-${index}`}
                  index={index}
                />
              ))}
            </Carousel>
          </section>
        ) : (
          (lists.length > 0 || !listsLoading) && (
            <section className="mb-4 md:mb-8">
              <Carousel
                title="Your Lists"
                itemsPerView={ITEMS_PER_CAROUSEL}
                targetCardWidth={ITEM_TARGET_WIDTH}
              >
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
          )
        )}

        {/* Movies Section */}
        {suggestionsLoading ? (
          <section className="mb-4 md:mb-8">
            <Carousel
              title="Popular Movies"
              itemsPerView={ITEMS_PER_CAROUSEL}
              targetCardWidth={ITEM_TARGET_WIDTH}
              disableNavigation
            >
              {Array.from({ length: PLACEHOLDER_COUNT }).map((_, index) => (
                <PlaceholderCard
                  key={`movie-placeholder-${index}`}
                  index={index}
                />
              ))}
            </Carousel>
          </section>
        ) : (
          suggestions.movies.length > 0 && (
            <section className="mb-4 md:mb-8">
              <Carousel
                title="Popular Movies"
                itemsPerView={ITEMS_PER_CAROUSEL}
                targetCardWidth={ITEM_TARGET_WIDTH}
              >
                {suggestions.movies.map((movie) => (
                  <ContentCard key={`movie-${movie.id}`} item={movie} />
                ))}
              </Carousel>
            </section>
          )
        )}

        {/* TV Shows Section */}
        {suggestionsLoading ? (
          <section className="mb-4 md:mb-8">
            <Carousel
              title="Popular TV Shows"
              itemsPerView={ITEMS_PER_CAROUSEL}
              targetCardWidth={ITEM_TARGET_WIDTH}
              disableNavigation
            >
              {Array.from({ length: PLACEHOLDER_COUNT }).map((_, index) => (
                <PlaceholderCard key={`tv-placeholder-${index}`} index={index} />
              ))}
            </Carousel>
          </section>
        ) : (
          suggestions.tvShows.length > 0 && (
            <section className="mb-4 md:mb-8">
              <Carousel
                title="Popular TV Shows"
                itemsPerView={ITEMS_PER_CAROUSEL}
                targetCardWidth={ITEM_TARGET_WIDTH}
              >
                {suggestions.tvShows.map((show) => (
                  <ContentCard key={`tv-${show.id}`} item={show} />
                ))}
              </Carousel>
            </section>
          )
        )}

        {/* Games Section */}
        {suggestionsLoading ? (
          <section className="mb-4 md:mb-8">
            <Carousel
              title="Popular Games"
              itemsPerView={ITEMS_PER_CAROUSEL}
              targetCardWidth={ITEM_TARGET_WIDTH}
              disableNavigation
            >
              {Array.from({ length: PLACEHOLDER_COUNT }).map((_, index) => (
                <PlaceholderCard
                  key={`game-placeholder-${index}`}
                  index={index}
                />
              ))}
            </Carousel>
          </section>
        ) : (
          suggestions.games.length > 0 && (
            <section className="mb-4 md:mb-8">
              <Carousel
                title="Popular Games"
                itemsPerView={ITEMS_PER_CAROUSEL}
                targetCardWidth={ITEM_TARGET_WIDTH}
              >
                {suggestions.games.map((game) => (
                  <ContentCard key={`game-${game.id}`} item={game} />
                ))}
              </Carousel>
            </section>
          )
        )}

        {/* Music Section */}
        {suggestionsLoading ? (
          <section className="mb-4 md:mb-8">
            <Carousel
              title="Popular Music"
              itemsPerView={ITEMS_PER_CAROUSEL}
              targetCardWidth={ITEM_TARGET_WIDTH}
              disableNavigation
            >
              {Array.from({ length: PLACEHOLDER_COUNT }).map((_, index) => (
                <PlaceholderCard
                  key={`music-placeholder-${index}`}
                  index={index}
                />
              ))}
            </Carousel>
          </section>
        ) : (
          suggestions.music.length > 0 && (
            <section className="mb-4 md:mb-8">
              <Carousel
                title="Popular Music"
                itemsPerView={ITEMS_PER_CAROUSEL}
                targetCardWidth={ITEM_TARGET_WIDTH}
              >
                {suggestions.music.map((album) => (
                  <ContentCard key={`music-${album.id}`} item={album} />
                ))}
              </Carousel>
            </section>
          )
        )}

        {/* Books Section */}
        {suggestionsLoading ? (
          <section className="mb-4 md:mb-8">
            <Carousel
              title="Popular Books"
              itemsPerView={ITEMS_PER_CAROUSEL}
              targetCardWidth={ITEM_TARGET_WIDTH}
              disableNavigation
            >
              {Array.from({ length: PLACEHOLDER_COUNT }).map((_, index) => (
                <PlaceholderCard
                  key={`book-placeholder-${index}`}
                  index={index}
                />
              ))}
            </Carousel>
          </section>
        ) : (
          suggestions.books.length > 0 && (
            <section className="mb-4 md:mb-8">
              <Carousel
                title="Popular Books"
                itemsPerView={ITEMS_PER_CAROUSEL}
                targetCardWidth={ITEM_TARGET_WIDTH}
              >
                {suggestions.books.map((book) => (
                  <ContentCard key={`book-${book.id}`} item={book} />
                ))}
              </Carousel>
            </section>
          )
        )}

        {/* Empty state */}
        {!suggestionsLoading &&
          suggestions.movies.length === 0 &&
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

        <Footer />
      </div>

      {/* Bottom gradient */}
      <div className="pointer-events-none fixed left-0 right-0 bottom-0 h-16 bg-bottom-gradient z-10" />
    </div>
  );
}
