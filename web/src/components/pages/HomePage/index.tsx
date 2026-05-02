
import { Footer } from "../../layout/Footer";
import { FeaturedBanner } from "./FeaturedBanner";
import { FeaturedBannerPlaceholder } from "./FeaturedBannerPlaceholder";
import { useFeaturedItems } from "./hooks/useFeaturedItems";
import { ErrorState } from "../../common/state/ErrorState";
import { EmptyState } from "../../common/state/EmptyState";
import { ContentCarousels } from "./components/ContentCarousels";
import { useHomeData } from "./hooks/useHomeData";
import type { HomepageResponse, PaginatedUserListList } from "@/lib/types";

interface HomePageProps {
  country?: string | null;
  initialSuggestions?: HomepageResponse;
  initialLists?: PaginatedUserListList;
}

export function HomePage({
  country,
  initialSuggestions,
  initialLists,
}: HomePageProps) {
  const data = useHomeData({ country, initialSuggestions, initialLists });

  const { featuredItems } = useFeaturedItems({
    movies: data.suggestions.movies,
    tvShows: data.suggestions.tvShows,
    games: data.suggestions.games,
    music: data.suggestions.music,
  });

  return (
    <div className="relative w-full min-h-screen bg-background-logged-in">
      <div className="pt-30 pb-20">
        <section className="-mt-30 mb-6 md:mb-10 relative z-0">
          {data.suggestionsError || featuredItems.length === 0
            ? <FeaturedBannerPlaceholder />
            : <FeaturedBanner items={featuredItems} />
          }
        </section>

        {data.suggestionsError && (
          <ErrorState
            error={data.suggestionsError}
            title="Could not load homepage suggestions"
          />
        )}

        <ContentCarousels
          suggestions={data.suggestions}
          lists={data.lists}
          suggestionsError={data.suggestionsError}
          listsError={data.listsError}
          createList={data.createList}
          isCreatingList={data.isCreatingList}
        />

        {data.isAllEmpty && <EmptyState />}

        <Footer />
      </div>

      <div className="pointer-events-none fixed left-0 right-0 bottom-0 h-16 bg-bottom-gradient z-10" />
    </div>
  );
}
