import { ContentCard } from "@/components/common/cards/ContentCard";
import { ListCard } from "@/components/common/cards/ListCard";
import { CreateListCard } from "@/components/common/cards/CreateListCard";
import { Carousel } from "@/components/common/ui/Carousel";
import { ErrorState } from "@/components/common/state/ErrorState";
import {
  CONTENT_TYPE_DEFINITIONS,
  type DiscoveryContentType,
} from "@/lib/contentTypes";
import { Content, ContentType, ListType, UserList } from "@/lib/types";

const CONTENT_SECTIONS = [
  { key: "movies", type: ContentType.MOVIE },
  { key: "tvShows", type: ContentType.TV_SHOW },
  { key: "games", type: ContentType.GAME },
  { key: "music", type: ContentType.ALBUM },
  { key: "books", type: ContentType.BOOK },
] as const satisfies ReadonlyArray<{
  key: keyof ContentCarouselsProps["suggestions"];
  type: DiscoveryContentType;
}>;

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
  type: DiscoveryContentType;
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

      {!suggestionsError && CONTENT_SECTIONS.map(({ key, type }) => (
        <CarouselSection
          key={key}
          type={type}
          items={suggestions[key]}
          keyPrefix={key}
        />
      ))}
    </>
  );
}

function CarouselSection({
  type,
  items,
  keyPrefix,
}: CarouselSectionProps) {
  if (items.length === 0) {
    return null;
  }

  const definition = CONTENT_TYPE_DEFINITIONS[type];

  return (
    <Carousel
      title={definition.sectionTitle ?? definition.pluralLabel}
      titleIcon={definition.icon}
      className="mb-4 md:mb-8"
    >
      {items.map((item) => (
        <ContentCard key={`${keyPrefix}-${item.id}`} item={item} />
      ))}
    </Carousel>
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
    <Carousel title="Your Lists" className="mb-4 md:mb-8">
      {[
        ...lists.map((list) => <ListCard key={`list-${list.id}`} list={list} />),
        <CreateListCard
          key="create-list"
          onCreateList={handleCreateList}
          isLoading={isLoading}
        />,
      ]}
    </Carousel>
  );
}
