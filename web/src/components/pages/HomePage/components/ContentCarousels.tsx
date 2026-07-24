import { ContentCard } from "@/components/common/cards/ContentCard";
import { ListCard } from "@/components/common/cards/ListCard";
import { CreateListCard } from "@/components/common/cards/CreateListCard";
import { Carousel } from "@/components/common/ui/Carousel";
import { ErrorState } from "@/components/common/state/ErrorState";
import { Content } from "@/lib/types";
import { ListType, UserList } from "@/lib/types";

const CONTENT_SECTIONS = [
  { key: 'movies', title: 'Popular Movies' },
  { key: 'tvShows', title: 'Popular TV Shows' },
  { key: 'games', title: 'Popular Games' },
  { key: 'music', title: 'Popular Music' },
  { key: 'books', title: 'Popular Books' },
];

interface ContentCarouselsProps {
  suggestions: {
    movies: Content[];
    tvShows: Content[];
    games: Content[];
    music: Content[];
    books: Content[];
  };
  lists: UserList[];
  suggestionsError?: string | null;
  listsError?: string | null;
  createList: (
    name: string,
    description?: string,
    listType?: ListType
  ) => Promise<unknown>;
  isCreatingList?: boolean;
  showPersonalLists?: boolean;
}

interface CarouselSectionProps {
  title: string;
  items: Content[];
  keyPrefix: string;
}

export function ContentCarousels({
  suggestions,
  lists,
  suggestionsError,
  listsError,
  createList,
  isCreatingList = false,
  showPersonalLists = false,
}: ContentCarouselsProps) {
  return (
    <>
      {showPersonalLists && (
        <ListsCarousel
          lists={lists}
          error={listsError}
          createList={createList}
          isLoading={isCreatingList}
        />
      )}

      {!suggestionsError && CONTENT_SECTIONS.map(({ key, title }) => (
        <CarouselSection
          key={key}
          title={title}
          items={suggestions[key as keyof typeof suggestions]}
          keyPrefix={key}
        />
      ))}
    </>
  );
}

function CarouselSection({
  title,
  items,
  keyPrefix,
}: CarouselSectionProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mb-4 md:mb-8">
      <Carousel
        title={title}
      >
        {items.map((item) => (
          <ContentCard key={`${keyPrefix}-${item.id}`} item={item} />
        ))}
      </Carousel>
    </section>
  );
}

function ListsCarousel({
  lists,
  error,
  isLoading,
  createList,
}: {
  lists: UserList[];
  error?: string | null;
  isLoading: boolean;
  createList: (
    name: string,
    description?: string,
    listType?: ListType
  ) => Promise<unknown>;
}) {
  if (error) {
    return (
      <ErrorState
        error={error}
        title="Could not load your lists"
      />
    );
  }

  if (lists.length === 0 && !isLoading) {
    return null;
  }

  const handleCreateList = async (name: string) => {
    await createList(name);
  };

  return (
    <section className="mb-4 md:mb-8">
      <Carousel title="Your Lists">
        {[
          ...lists.map((list) => <ListCard key={`list-${list.id}`} list={list} />),
          <CreateListCard
            key="create-list"
            onCreateList={handleCreateList}
            isLoading={isLoading}
          />,
        ]}
      </Carousel>
    </section>
  );
}
