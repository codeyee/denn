import ContentCard from "@/app/_components/cards/ContentCard";
import ListCard from "@/app/_components/cards/ListCard";
import CreateListCard from "@/app/_components/cards/CreateListCard";
import Carousel from "@/app/_components/common/Carousel";
import { LoadingCarousel } from "@/app/_components/common/LoadingCarousel";
import { Content } from "@/types";
import { List } from "@/lib/api/types";
import { CONTENT_SECTIONS } from "../config";

interface ContentCarouselsProps {
  suggestions: {
    movies: Content[];
    tvShows: Content[];
    games: Content[];
    music: Content[];
    books: Content[];
  };
  lists: List[];
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
  lists: List[];
  isLoading: boolean;
  createList: (name: string) => void;
}) {
  if (isLoading) {
    return <LoadingCarousel title="Your Lists" />;
  }

  if (lists.length === 0 && !isLoading) {
    return null;
  }

  return (
    <section className="mb-4 md:mb-8">
      <Carousel title="Your Lists">
        {[
          ...lists.map((list) => <ListCard key={`list-${list.id}`} list={list} />),
          <CreateListCard
            key="create-list"
            onCreateList={createList}
            isLoading={isLoading}
          />,
        ]}
      </Carousel>
    </section>
  );
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
