import { useRouter } from "@tanstack/react-router";

import { ContentCard } from "@/components/common/cards/ContentCard";
import { ErrorState } from "@/components/common/state/ErrorState";
import { EmptyState } from "@/components/common/state/EmptyState";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { CONTENT_TYPE_DEFINITIONS } from "@/lib/contentTypes";
import { useBrowseQuery } from "@/lib/api/queries";
import { ContentType, type BrowseResponse, type BrowseType, type Content } from "@/lib/types";
import { BrowsePagination } from "./components/BrowsePagination";
import { BrowseSkeleton } from "./components/BrowseSkeleton";
import { BrowseToolbar } from "./components/BrowseToolbar";
import { transformBrowseResults } from "./utils";

export interface BrowsePageSearch {
  page: number;
  sort: "popular" | "recent";
  q?: string;
}

interface BrowsePageProps {
  type: BrowseType;
  search: BrowsePageSearch;
  country?: string | null;
  initialData?: BrowseResponse;
}

export function BrowsePage({
  type,
  search,
  country,
  initialData,
}: BrowsePageProps) {
  const router = useRouter();
  const definition = CONTENT_TYPE_DEFINITIONS[definitionType(type)];
  const query = search.q?.trim() ?? "";
  const browseQuery = useBrowseQuery(
    type,
    search.page,
    search.sort,
    query,
    { country, initialData },
  );
  const response = browseQuery.data;
  const items = response
    ? transformBrowseResults(type, response.results).filter((item) => item.denn_id)
    : [];

  return (
    <div className="relative w-full overflow-x-hidden">
      <Navbar />
      <main
        id="main-content"
        tabIndex={-1}
        className="min-h-screen bg-background-logged-in px-4 pb-20 pt-28 md:px-8 lg:pt-36"
      >
        <div className="mx-auto max-w-[112rem]">
          <header>
            <p className="text-sm text-white/60">Public catalog</p>
            <h1 className="mt-2 text-wrap-balance font-mono text-3xl font-bold text-white md:text-4xl">
              Browse {definition.pluralLabel}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/65 md:text-base">
              Explore {definition.pluralLabel.toLowerCase()} and open any title in Denn.
            </p>
          </header>

          <BrowseToolbar
            type={type}
            page={search.page}
            sort={search.sort}
            query={query}
          />

          {response?.status === "degraded" && (
            <div className="mt-4 rounded-md border border-yellow-300/30 bg-yellow-300/10 px-4 py-3 text-sm text-yellow-100" role="status">
              Some catalog data is temporarily unavailable. Showing the safe response available now.
            </div>
          )}

          {browseQuery.isLoading && !response ? <BrowseSkeleton /> : null}

          {browseQuery.error && !response ? (
            <div className="mt-6">
              <ErrorState error={browseQuery.error} title="Could not load browse results" />
              <div className="flex justify-center">
                <button
                  type="button"
                  className="min-h-11 rounded-md bg-primary px-5 py-2 text-primary-foreground focus-visible:ring-4 focus-visible:ring-white/80"
                  onClick={() => void router.invalidate()}
                >
                  Retry
                </button>
              </div>
            </div>
          ) : null}

          {response && items.length > 0 ? (
            <section aria-labelledby="browse-results-heading" className="mt-8">
              <h2 id="browse-results-heading" className="sr-only">
                {query ? `Search results for ${query}` : `${definition.pluralLabel} results`}
              </h2>
              <BrowseGrid items={items} />
              <BrowsePagination
                type={type}
                page={search.page}
                totalPages={response.metadata.total_pages}
                sort={search.sort}
                query={query}
              />
            </section>
          ) : null}

          {response && response.status === "empty" && items.length === 0 ? (
            <section className="mt-8 rounded-xl border border-white/10 bg-white/[0.04]">
              <EmptyState
                compact
                message={query ? `No ${definition.pluralLabel.toLowerCase()} found for “${query}”.` : `No ${definition.pluralLabel.toLowerCase()} are available right now.`}
              />
            </section>
          ) : null}

          {response && response.status !== "empty" && items.length === 0 && !browseQuery.isLoading ? (
            <section className="mt-8 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-8 text-center text-sm text-white/65">
              No navigable Denn titles are available on this page yet.
            </section>
          ) : null}
        </div>
        <Footer />
      </main>
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-10 h-16 bg-bottom-gradient" />
    </div>
  );
}

function BrowseGrid({ items }: { items: Content[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6" data-browse-grid>
      {items.map((item) => (
        <ContentCard key={`${item.type}-${item.id}`} item={item} />
      ))}
    </div>
  );
}

function definitionType(type: BrowseType) {
  switch (type) {
    case "movies": return ContentType.MOVIE;
    case "tv-shows": return ContentType.TV_SHOW;
    case "games": return ContentType.GAME;
    case "music": return ContentType.ALBUM;
    case "books": return ContentType.BOOK;
  }
}
