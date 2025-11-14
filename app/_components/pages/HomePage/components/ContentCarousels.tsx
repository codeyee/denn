import ContentCard from "@/app/_components/cards/ContentCard";
import ListCard from "@/app/_components/cards/ListCard";
import CreateListCard from "@/app/_components/cards/CreateListCard";
import Carousel from "@/app/_components/common/ui/Carousel";
import { LoadingCarousel } from "@/app/_components/common/state/LoadingCarousel";
import { Content } from "@/types";
import { UserList } from "@/lib/api/types";

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
  suggestionsLoading: boolean;
  listsLoading: boolean;
  createList: (name: string) => void;
}

interface CarouselSectionProps {
  title: string;
  items: Content[];
  isLoading: boolean;
  keyPrefix: string;
}

export function ContentCarousels({
  suggestions,
  lists,
  suggestionsLoading,
  listsLoading,
  createList,
}: ContentCarouselsProps) {
  return (
    <>
      <ListsCarousel
        lists={lists}
        isLoading={listsLoading}
        createList={createList}
      />

      {CONTENT_SECTIONS.map(({ key, title }) => (
        <CarouselSection
          key={key}
          title={title}
          items={suggestions[key as keyof typeof suggestions]}
          isLoading={suggestionsLoading}
          keyPrefix={key}
        />
      ))}
    </>
  );
}

function CarouselSection({
  title,
  items,
  isLoading,
  keyPrefix,
}: CarouselSectionProps) {
  if (isLoading) {
    return <LoadingCarousel title={title} />;
  }

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
  isLoading,
  createList,
}: {
  lists: UserList[];
  isLoading: boolean;
  createList: (name: string) => void;
}) {
  if (isLoading) {
    return <LoadingCarousel title="Your Lists" />;
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
