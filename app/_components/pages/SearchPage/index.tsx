"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import ContentCard from "../../cards/ContentCard";
import PlaceholderCard from "../../cards/PlaceholderCard";
import Carousel from "../../common/Carousel";
import Footer from "../../layout/Footer";
import { videoActions, gameActions, musicActions, bookActions } from "@/lib/api/actions";
import type {
  VideoSearchItem,
  GameSearchItem,
  MusicSearchItem,
  BookSearchItem,
} from "@/lib/api/types";
import type { Movie, TVShow, Game, MusicAlbum, Book } from "@/types/contentTypes";

const ITEMS_PER_CAROUSEL = undefined;
const ITEM_TARGET_WIDTH = 250;
const DEBOUNCE_DELAY = 500;
const PLACEHOLDER_COUNT = 6; // Number of placeholder cards to show per category

interface SearchResults {
  movies: Movie[];
  tvShows: TVShow[];
  games: Game[];
  music: MusicAlbum[];
  books: Book[];
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({
    movies: [],
    tvShows: [],
    games: [],
    music: [],
    books: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentSearchQueryRef = useRef<string>("");

  // Read query from URL and debounce it
  useEffect(() => {
    const queryFromUrl = searchParams.get("q") || "";
    
    const timer = setTimeout(() => {
      setDebouncedQuery(queryFromUrl);
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timer);
  }, [searchParams]);

  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedQuery.trim()) {
        setResults({
          movies: [],
          tvShows: [],
          games: [],
          music: [],
          books: [],
        });
        setIsLoading(false);
        currentSearchQueryRef.current = "";
        return;
      }

      const searchQueryForThisRequest = debouncedQuery.trim();
      currentSearchQueryRef.current = searchQueryForThisRequest;

      setIsLoading(true);
      setError(null);

      try {
        const [videoResponse, gameResponse, musicResponse, bookResponse] =
          await Promise.all([
            videoActions.search({ query: searchQueryForThisRequest, limit: 20 }),
            gameActions.search({ query: searchQueryForThisRequest, limit: 20 }),
            musicActions.search({ query: searchQueryForThisRequest, limit: 20 }),
            bookActions.search({ query: searchQueryForThisRequest, limit: 20 }),
          ]);

        if (currentSearchQueryRef.current !== searchQueryForThisRequest) {
          return;
        }

        const movies: Movie[] = [];
        const tvShows: TVShow[] = [];

        videoResponse.results.forEach((item: VideoSearchItem) => {
          const contentItem = {
            id: item.id,
            type: item.type,
            title: item.title,
            original_title: item.original_title || undefined,
            description: item.description || undefined,
            image_url: item.image_url || undefined,
            release_date: item.release_date || undefined,
          };

          if (item.type === "movie") {
            movies.push(contentItem as Movie);
          } else if (item.type === "tv") {
            tvShows.push(contentItem as TVShow);
          }
        });

        const games: Game[] = gameResponse.results.map((item: GameSearchItem) => ({
          id: item.id,
          title: item.title,
          type: item.type || undefined,
          release_date: item.release_date || undefined,
          description: item.description || undefined,
          image_url: item.image_url || undefined,
          authors: item.authors || undefined,
          platforms: item.platforms || undefined,
        }));

        const music: MusicAlbum[] = musicResponse.results.map(
          (item: MusicSearchItem) => ({
            id: item.id,
            type: item.type || undefined,
            title: item.title,
            authors: item.authors || undefined,
            image_url: item.image_url || undefined,
            release_date: item.release_date || undefined,
            total_tracks: item.total_tracks || undefined,
            album_type: item.album_type || undefined,
            external_url: item.external_url || undefined,
          })
        );

        const books: Book[] = bookResponse.results.map((item: BookSearchItem) => ({
          id: item.id,
          title: item.title,
          authors: item.authors || undefined,
          image_url: item.image_url || undefined,
          release_date: item.release_date || undefined,
          pages: item.pages || undefined,
          description: item.description || undefined,
        }));

        setResults({
          movies,
          tvShows,
          games,
          music,
          books,
        });
      } catch (err) {
        if (currentSearchQueryRef.current === searchQueryForThisRequest) {
          setError(
            err instanceof Error ? err.message : "An error occurred while searching"
          );
          setResults({
            movies: [],
            tvShows: [],
            games: [],
            music: [],
            books: [],
          });
        }
      } finally {
        if (currentSearchQueryRef.current === searchQueryForThisRequest) {
          setIsLoading(false);
        }
      }
    };

    performSearch();
  }, [debouncedQuery]);

  const hasResults =
    results.movies.length > 0 ||
    results.tvShows.length > 0 ||
    results.games.length > 0 ||
    results.music.length > 0 ||
    results.books.length > 0;

  return (
    <div className="relative w-full min-h-screen bg-background-logged-in">
      <div className="pt-30 pb-20">
        {/* Error State */}
        {error && !isLoading && (
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">
              <p className="text-red-400 text-xl mb-4">Error searching</p>
              <p className="text-gray-400">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State with Placeholders */}
        {isLoading && debouncedQuery.trim() && (
          <>
            {/* Movies Placeholders */}
            <section className="mb-4 md:mb-8">
              <Carousel
                title="Movies"
                itemsPerView={ITEMS_PER_CAROUSEL}
                targetCardWidth={ITEM_TARGET_WIDTH}
                disableNavigation
              >
                {Array.from({ length: PLACEHOLDER_COUNT }).map((_, index) => (
                  <PlaceholderCard key={`movie-placeholder-${index}`} index={index} />
                ))}
              </Carousel>
            </section>

            {/* TV Shows Placeholders */}
            <section className="mb-4 md:mb-8">
              <Carousel
                title="TV Shows"
                itemsPerView={ITEMS_PER_CAROUSEL}
                targetCardWidth={ITEM_TARGET_WIDTH}
                disableNavigation
              >
                {Array.from({ length: PLACEHOLDER_COUNT }).map((_, index) => (
                  <PlaceholderCard key={`tv-placeholder-${index}`} index={index} />
                ))}
              </Carousel>
            </section>

            {/* Games Placeholders */}
            <section className="mb-4 md:mb-8">
              <Carousel
                title="Games"
                itemsPerView={ITEMS_PER_CAROUSEL}
                targetCardWidth={ITEM_TARGET_WIDTH}
                disableNavigation
              >
                {Array.from({ length: PLACEHOLDER_COUNT }).map((_, index) => (
                  <PlaceholderCard key={`game-placeholder-${index}`} index={index} />
                ))}
              </Carousel>
            </section>

            {/* Music Placeholders */}
            <section className="mb-4 md:mb-8">
              <Carousel
                title="Music"
                itemsPerView={ITEMS_PER_CAROUSEL}
                targetCardWidth={ITEM_TARGET_WIDTH}
                disableNavigation
              >
                {Array.from({ length: PLACEHOLDER_COUNT }).map((_, index) => (
                  <PlaceholderCard key={`music-placeholder-${index}`} index={index} />
                ))}
              </Carousel>
            </section>

            {/* Books Placeholders */}
            <section className="mb-4 md:mb-8">
              <Carousel
                title="Books"
                itemsPerView={ITEMS_PER_CAROUSEL}
                targetCardWidth={ITEM_TARGET_WIDTH}
                disableNavigation
              >
                {Array.from({ length: PLACEHOLDER_COUNT }).map((_, index) => (
                  <PlaceholderCard key={`book-placeholder-${index}`} index={index} />
                ))}
              </Carousel>
            </section>
          </>
        )}

        {/* Results Section */}
        {!isLoading && !error && (
          <>
            {/* Movies Section */}
            {results.movies.length > 0 && (
              <section className="mb-4 md:mb-8">
                <Carousel
                  title="Movies"
                  itemsPerView={ITEMS_PER_CAROUSEL}
                  targetCardWidth={ITEM_TARGET_WIDTH}
                >
                  {results.movies.map((movie) => (
                    <ContentCard key={`movie-${movie.id}`} item={movie} />
                  ))}
                </Carousel>
              </section>
            )}

            {/* TV Shows Section */}
            {results.tvShows.length > 0 && (
              <section className="mb-4 md:mb-8">
                <Carousel
                  title="TV Shows"
                  itemsPerView={ITEMS_PER_CAROUSEL}
                  targetCardWidth={ITEM_TARGET_WIDTH}
                >
                  {results.tvShows.map((show) => (
                    <ContentCard key={`tv-${show.id}`} item={show} />
                  ))}
                </Carousel>
              </section>
            )}

            {/* Games Section */}
            {results.games.length > 0 && (
              <section className="mb-4 md:mb-8">
                <Carousel
                  title="Games"
                  itemsPerView={ITEMS_PER_CAROUSEL}
                  targetCardWidth={ITEM_TARGET_WIDTH}
                >
                  {results.games.map((game) => (
                    <ContentCard key={`game-${game.id}`} item={game} />
                  ))}
                </Carousel>
              </section>
            )}

            {/* Music Section */}
            {results.music.length > 0 && (
              <section className="mb-4 md:mb-8">
                <Carousel
                  title="Music"
                  itemsPerView={ITEMS_PER_CAROUSEL}
                  targetCardWidth={ITEM_TARGET_WIDTH}
                >
                  {results.music.map((album) => (
                    <ContentCard key={`music-${album.id}`} item={album} />
                  ))}
                </Carousel>
              </section>
            )}

            {/* Books Section */}
            {results.books.length > 0 && (
              <section className="mb-4 md:mb-8">
                <Carousel
                  title="Books"
                  itemsPerView={ITEMS_PER_CAROUSEL}
                  targetCardWidth={ITEM_TARGET_WIDTH}
                >
                  {results.books.map((book) => (
                    <ContentCard key={`book-${book.id}`} item={book} />
                  ))}
                </Carousel>
              </section>
            )}

            {/* Empty State */}
            {!hasResults && debouncedQuery.trim() && (
              <div className="flex items-center justify-center min-h-[400px]">
                <p className="text-gray-400 text-lg">
                  No results found for &quot;{debouncedQuery}&quot;
                </p>
              </div>
            )}

            {/* Initial State */}
            {!debouncedQuery.trim() && (
              <div className="flex items-center justify-center min-h-[400px]">
                <p className="text-gray-400 text-lg">
                  Start typing to search for content
                </p>
              </div>
            )}
          </>
        )}

        <Footer />
      </div>

      {/* Bottom gradient */}
      <div className="pointer-events-none fixed left-0 right-0 bottom-0 h-16 bg-bottom-gradient z-10" />
    </div>
  );
}
