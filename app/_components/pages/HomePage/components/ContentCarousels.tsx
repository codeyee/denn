import ContentCard from "@/app/_components/cards/ContentCard";
import PlaceholderCard from "@/app/_components/cards/PlaceholderCard";
import ListCard from "@/app/_components/cards/ListCard";
import CreateListCard from "@/app/_components/cards/CreateListCard";
import Carousel from "@/app/_components/common/Carousel";
import { Content } from "@/types";
import { List } from "@/lib/api/types";
import { CAROUSEL_CONFIG, CONTENT_SECTIONS } from "../config";

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
  const { ITEMS_PER_CAROUSEL, ITEM_TARGET_WIDTH, PLACEHOLDER_COUNT } =
    CAROUSEL_CONFIG;

  if (isLoading) {
    return (
      <section className="mb-4 md:mb-8">
        <Carousel
          title={title}
          itemsPerView={ITEMS_PER_CAROUSEL}
          targetCardWidth={ITEM_TARGET_WIDTH}
          disableNavigation
        >
          {Array.from({ length: PLACEHOLDER_COUNT }).map((_, index) => (
            <PlaceholderCard
              key={`${keyPrefix}-placeholder-${index}`}
              index={index}
            />
          ))}
        </Carousel>
      </section>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mb-4 md:mb-8">
      <Carousel
        title={title}
        itemsPerView={ITEMS_PER_CAROUSEL}
        targetCardWidth={ITEM_TARGET_WIDTH}
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
  const { ITEMS_PER_CAROUSEL, ITEM_TARGET_WIDTH, PLACEHOLDER_COUNT } =
    CAROUSEL_CONFIG;

  if (isLoading) {
    return (
      <section className="mb-4 md:mb-8">
        <Carousel
          title="Your Lists"
          itemsPerView={ITEMS_PER_CAROUSEL}
          targetCardWidth={ITEM_TARGET_WIDTH}
          disableNavigation
        >
          {Array.from({ length: PLACEHOLDER_COUNT }).map((_, index) => (
            <PlaceholderCard key={`list-placeholder-${index}`} index={index} />
          ))}
        </Carousel>
      </section>
    );
  }

  if (lists.length === 0 && !isLoading) {
    return null;
  }

  return (
    <section className="mb-4 md:mb-8">
      <Carousel
        title="Your Lists"
        itemsPerView={ITEMS_PER_CAROUSEL}
        targetCardWidth={ITEM_TARGET_WIDTH}
      >
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
