"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import ContentCard from "../../cards/ContentCard";
import PlaceholderCard from "../../cards/PlaceholderCard";
import Carousel from "../../common/Carousel";
import Footer from "../../layout/Footer";
import { videoActions, gameActions, musicActions, bookActions } from "@/lib/api/actions";
import type { SearchItem } from "@/lib/api/types";
import type { Movie, TVShow, Game, MusicAlbum, Book } from "@/types/contentTypes";

const ITEMS_PER_CAROUSEL = undefined;
const ITEM_TARGET_WIDTH = 250;
const DEBOUNCE_DELAY = 500;
const SEARCH_DEBOUNCE_MS = 300;
const PREV_PAGE_KEY = "denn_search_prev_page";
const PLACEHOLDER_COUNT = 6; // Number of placeholder cards to show per category

interface SearchResults {
  movies: Movie[];
  tvShows: TVShow[];
  games: Game[];
  music: MusicAlbum[];
  books: Book[];
}

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
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
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasUserTypedRef = useRef(false);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const queryFromUrl = searchParams.get("q") || "";
    setSearchQuery(queryFromUrl);
  }, [searchParams]);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const trimmedQuery = searchQuery.trim();
      const urlQuery = searchParams.get("q") || "";

      if (trimmedQuery !== urlQuery) {
        if (trimmedQuery) {
          router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`, { scroll: false });
          hasUserTypedRef.current = true;
        } else {
          if (hasUserTypedRef.current) {
            const prevPage = typeof window !== "undefined" 
              ? sessionStorage.getItem(PREV_PAGE_KEY) || "/"
              : "/";
            router.push(prevPage);
          }
        }
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, router, searchParams]);

  useEffect(() => {
    if (mobileInputRef.current) {
      requestAnimationFrame(() => {
        mobileInputRef.current?.focus();
      });
    }
  }, []);

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
        const [movieResponse, tvResponse, gameResponse, musicResponse, bookResponse] =
          await Promise.all([
            videoActions.searchMovies({ query: searchQueryForThisRequest, page_size: 20 }),
            videoActions.searchTVShows({ query: searchQueryForThisRequest, page_size: 20 }),
            gameActions.search({ query: searchQueryForThisRequest, page_size: 20 }),
            musicActions.search({ query: searchQueryForThisRequest, page_size: 20 }),
            bookActions.search({ query: searchQueryForThisRequest, page_size: 20 }),
          ]);

        if (currentSearchQueryRef.current !== searchQueryForThisRequest) {
          return;
        }

        const movies: Movie[] = movieResponse.results.map((item: SearchItem) => ({
          id: item.id as number,
          type: item.type,
          title: item.title,
          original_title: item.original_title || undefined,
          description: item.description || undefined,
          image_url: item.image_url || undefined,
          release_date: item.release_date || undefined,
          authors: item.authors || undefined,
        })) as Movie[];

        const tvShows: TVShow[] = tvResponse.results.map((item: SearchItem) => ({
          id: item.id as number,
          type: item.type,
          title: item.title,
          original_title: item.original_title || undefined,
          description: item.description || undefined,
          image_url: item.image_url || undefined,
          release_date: item.release_date || undefined,
          authors: item.authors || undefined,
        })) as TVShow[];

        const games: Game[] = gameResponse.results.map((item: SearchItem) => ({
          id: item.id as number,
          title: item.title,
          type: item.type || undefined,
          original_title: item.original_title || undefined,
          release_date: item.release_date || undefined,
          description: item.description || undefined,
          image_url: item.image_url || undefined,
          authors: item.authors || undefined,
        }));

        const music: MusicAlbum[] = musicResponse.results.map(
          (item: SearchItem) => ({
            id: item.id as string,
            type: item.type || undefined,
            title: item.title,
            original_title: item.original_title || undefined,
            description: item.description || undefined,
            authors: item.authors || undefined,
            image_url: item.image_url || undefined,
            release_date: item.release_date || undefined,
          })
        );

        const books: Book[] = bookResponse.results.map((item: SearchItem) => ({
          id: item.id as string,
          type: item.type || undefined,
          title: item.title,
          original_title: item.original_title || undefined,
          authors: item.authors || undefined,
          image_url: item.image_url || undefined,
          release_date: item.release_date || undefined,
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
      {/* Mobile Search Input - Only visible on mobile/tablet (below lg) */}
      <div className="lg:hidden container mx-auto px-4 mt-8 pt-24 pb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300 pointer-events-none z-10" />
          <input
            ref={mobileInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              hasUserTypedRef.current = true;
            }}
            placeholder="Search for movies, TV shows, games..."
            className="w-full pl-12 pr-4 py-3 bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/40 transition-all"
          />
        </div>
      </div>
      <div className="pt-5 lg:pt-30 pb-20">
        {/* Error State */}
        {error && !isLoading && (
          <div className="container mx-auto px-4 mt-8 py-8">
            <div className="text-center">
              <p className="text-red-400 text-xl mb-4">Error searching</p>
              <p className="text-gray-400">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State with Placeholders - Show immediately when user types, not waiting for debounce */}
        {(isLoading || (searchQuery.trim() && !hasResults && !error)) && (
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

        {/* Results Section - Show when not loading and search has completed */}
        {!isLoading && !error && debouncedQuery.trim() && (
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

            {/* No Results State */}
            {!hasResults && (
              <div className="flex items-center justify-center min-h-[400px]">
                <p className="text-gray-400 text-lg">
                  No results found for &quot;{debouncedQuery}&quot;
                </p>
              </div>
            )}
          </>
        )}

        {/* Initial State - Only show when query is completely empty and not loading */}
        {!searchQuery.trim() && !isLoading && !error && (
          <div className="flex items-center justify-center min-h-[400px]">
            <p className="text-gray-400 text-lg">
              Start typing to search for content
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
