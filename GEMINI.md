# Project Overview

This is a Next.js web application that serves as a media aggregator. It allows users to discover and track movies, TV shows, games, music, and books. The application features user authentication, personalized content feeds, and the ability to create and manage custom lists of media.

**Key Technologies:**

*   **Framework:** Next.js
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS
*   **State Management:** Zustand
*   **Authentication:** JWT-based authentication with a backend API
*   **API Interaction:** The application fetches data from a backend API, which in turn aggregates data from external sources like TMDB, Spotify, IGDB, and Open Library.

**Architecture:**

The application follows a component-based architecture, with a clear separation of concerns between UI components, state management, and API interactions.

*   **`app/`:** Contains the main application logic, including pages, components, hooks, and stores.
*   **`lib/`:** Contains utility functions and the API client.
*   **`public/`:** Contains static assets like fonts and images.

# Building and Running

**1. Install Dependencies:**

```bash
npm install
```

**2. Run the Development Server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

**3. Build for Production:**

```bash
npm run build
```

**4. Run in Production Mode:**

```bash
npm run start
```

**5. Linting:**

```bash
npm run lint
```

# Development Conventions

*   **Coding Style:** The project uses ESLint to enforce a consistent coding style.
*   **State Management:** Zustand is used for global state management. Stores are organized by feature (e.g., `auth-store`, `content-store`).
*   **API Interaction:** All API requests are handled by the `lib/api/api.ts` client, which provides a consistent interface for making authenticated and unauthenticated requests.
*   **Components:** Components are organized by feature and type (e.g., `cards`, `common`, `forms`, `layout`, `pages`).
*   **Authentication:** The `useAuth` hook provides a simple interface for accessing authentication state and performing authentication-related actions.

---

# CODE QUALITY STANDARDS - MANDATORY FOR ALL AI ASSISTANTS

## SOLID Principles - MUST FOLLOW STRICTLY

### 1. Single Responsibility Principle (SRP) - CRITICAL PRIORITY

**Core Rule:** Every component, function, and module must have exactly ONE reason to change.

**STRICT Component Size Limits:**
- ✅ **Maximum: 200 lines** per component file (hard limit)
- ✅ **Recommended: 150 lines** for optimal maintainability
- ❌ **FORBIDDEN:** Components over 300 lines
- 🚨 **Action Required:** Components over 200 lines MUST be refactored immediately

**Bad Example - Component Doing Too Many Things:**
```typescript
// ❌ VIOLATION: 2000+ lines, multiple responsibilities
export default function ListDetailPage() {
  // 1. Data fetching responsibility
  const { data } = useApi(...);

  // 2. Drag-and-drop responsibility
  const handleDragStart = () => {...};
  const handleDragEnd = () => {...};

  // 3. Pagination responsibility
  const [currentPage, setCurrentPage] = useState(1);
  const handlePageChange = () => {...};

  // 4. Grouping responsibility
  const groupedItems = useMemo(() => {...}, []);

  // 5. Modal management responsibility
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // 6. Rendering responsibility (2000+ lines of JSX)
  return <div>...</div>;
}
```

**Good Example - Single Responsibility Applied:**
```typescript
// ✅ CORRECT: Each file has one clear responsibility

// File: ListDetailPage/index.tsx (~100 lines)
// Responsibility: Orchestration and composition
export default function ListDetailPage({ listId }: Props) {
  const listData = useListData(listId);
  const reordering = useListReordering(listId);
  const pagination = useListPagination(listData.items);
  const grouping = useListGrouping(listData.items);
  const modals = useListModals();

  return (
    <div>
      <ListHeader list={listData.list} />
      <ListContent
        items={pagination.currentItems}
        grouping={grouping}
        reordering={reordering}
      />
      <ListModals {...modals} />
    </div>
  );
}

// File: hooks/useListData.ts (~50 lines)
// Responsibility: Data fetching only
export function useListData(listId: string) {
  // Only handles data fetching
}

// File: hooks/useListReordering.ts (~80 lines)
// Responsibility: Drag-and-drop logic only
export function useListReordering(listId: string) {
  // Only handles reordering
}

// File: components/ListHeader.tsx (~80 lines)
// Responsibility: Header rendering only
export function ListHeader({ list }: Props) {
  // Only renders header
}
```

**SRP Validation Checklist:**
- [ ] Component purpose can be described in 5 words or less
- [ ] Component is under 200 lines
- [ ] Complex logic extracted to custom hooks
- [ ] Reusable UI extracted to sub-components
- [ ] No business logic mixed with UI rendering

---

### 2. Open/Closed Principle (OCP)

**Rule:** Components open for extension, closed for modification.

```typescript
// ❌ BAD: Requires modification for new types
function ContentCard({ content }: Props) {
  if (content.type === 'MOVIE') {
    return <div>{content.title} - {content.runtime}</div>;
  } else if (content.type === 'TV_SHOW') {
    return <div>{content.title} - {content.seasons}</div>;
  } else if (content.type === 'GAME') {
    return <div>{content.title} - {content.platforms}</div>;
  }
  // Adding new type = modifying this component
}

// ✅ GOOD: Extensible through composition
const CONTENT_RENDERERS: Record<ContentType, ComponentType> = {
  MOVIE: MovieDetails,
  TV_SHOW: TVShowDetails,
  GAME: GameDetails,
  // Adding new type = adding to map only
};

function ContentCard({ content }: Props) {
  const Renderer = CONTENT_RENDERERS[content.type];
  return (
    <Card>
      <CardHeader>{content.title}</CardHeader>
      <CardContent><Renderer content={content} /></CardContent>
    </Card>
  );
}
```

---

### 3. Liskov Substitution Principle (LSP)

**Rule:** Subtypes must be substitutable for base types.

```typescript
// ✅ GOOD: All cards implement same interface
interface CardProps {
  title: string;
  image: string;
  onClick: () => void;
}

export function MovieCard(props: CardProps) { /* ... */ }
export function TVShowCard(props: CardProps) { /* ... */ }
export function GameCard(props: CardProps) { /* ... */ }

// All cards interchangeable
function renderCard(Card: ComponentType<CardProps>, props: CardProps) {
  return <Card {...props} />;
}
```

---

### 4. Interface Segregation Principle (ISP)

**Rule:** Don't force components to depend on unused props.

```typescript
// ❌ BAD: Fat interface with many optional props
interface ListItemProps {
  item: ListItem;
  onEdit: () => void;
  onDelete: () => void;
  onRate: () => void;
  onMove: () => void;
  showActions: boolean;
  showRating: boolean;
  // 20+ more props...
}

// ✅ GOOD: Segregated interfaces
interface ListItemCoreProps {
  item: ListItem;
}

interface ListItemActionsProps {
  onEdit: () => void;
  onDelete: () => void;
}

// Component only accepts what it needs
function ListItemCard({ item, actions }: {
  item: ListItem;
  actions?: ListItemActionsProps;
}) {
  // ...
}
```

---

### 5. Dependency Inversion Principle (DIP)

**Rule:** Depend on abstractions, not concrete implementations.

```typescript
// ❌ BAD: Direct store dependency
function MyComponent() {
  const user = useAuthStore((state) => state.user);
  const lists = useListsStore((state) => state.lists);
  // Tightly coupled to Zustand
}

// ✅ GOOD: Abstract via custom hooks
function MyComponent() {
  const { user } = useAuth(); // Abstraction
  const { lists } = useLists(); // Abstraction
  // Can change implementation without touching component
}
```

---

## DRY Principle (Don't Repeat Yourself) - ZERO TOLERANCE

**Absolute Rule:** If code appears MORE THAN ONCE, extract it IMMEDIATELY.

### Critical Violations Found in This Project:

#### 1. Navigation URL Construction (Duplicated in 4+ files)

```typescript
// ❌ BAD: Repeated in ContentCard, ListItemCard, FeaturedBanner, ContentBanner
const params = new URLSearchParams({
  external_id: item.external_id,
  source_api: getSourceApi(item.type),
  content_type: item.type,
});
const url = `/content?${params.toString()}`;

// ✅ GOOD: Create lib/utils/navigationUtils.ts
export function buildContentUrl(params: ContentUrlParams): string {
  const searchParams = new URLSearchParams({
    external_id: params.externalId,
    source_api: params.sourceApi,
    content_type: params.contentType,
  });
  return `/content?${searchParams.toString()}`;
}

export function navigateToContent(
  router: AppRouterInstance,
  params: ContentUrlParams,
  options?: { newTab?: boolean; background?: boolean }
) {
  const url = buildContentUrl(params);
  if (options?.newTab) {
    const win = window.open(url, '_blank');
    if (options.background && win) {
      win.blur();
      window.focus();
    }
  } else {
    router.push(url);
  }
}
```

#### 2. SourceApi Mapping (Duplicated 27+ times)

```typescript
// ❌ BAD: Repeated across 3+ files
let sourceApi: SourceApi;
if (type === "MOVIE") sourceApi = SourceApi.TMDB;
else if (type === "TV_SHOW") sourceApi = SourceApi.TMDB;
else if (type === "GAME") sourceApi = SourceApi.IGDB;
// ...

// ✅ GOOD: Create lib/utils/contentTypeUtils.ts
export const CONTENT_TYPE_CONFIG: Record<string, {
  sourceApi: SourceApi;
  contentType: ContentType;
}> = {
  MOVIE: { sourceApi: SourceApi.TMDB, contentType: ContentType.MOVIE },
  TV_SHOW: { sourceApi: SourceApi.TMDB, contentType: ContentType.TV_SHOW },
  GAME: { sourceApi: SourceApi.IGDB, contentType: ContentType.GAME },
  MUSIC: { sourceApi: SourceApi.SPOTIFY, contentType: ContentType.MUSIC },
  BOOK: { sourceApi: SourceApi.OPENLIBRARY, contentType: ContentType.BOOK },
};

export function getSourceApi(type: string): SourceApi {
  return CONTENT_TYPE_CONFIG[type]?.sourceApi ?? SourceApi.TMDB;
}
```

#### 3. Status Badge Rendering (Duplicated 22+ times)

```typescript
// ❌ BAD: Same JSX in 22 places
<div className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
  item.status === ItemStatus.COMPLETED
    ? "bg-green-500/20 text-green-400 border border-green-500/30"
    : "bg-white/10 text-white/80 border border-white/20"
}`}>
  {item.status === ItemStatus.COMPLETED ? "COMPLETED" : "PENDING"}
</div>

// ✅ GOOD: Create app/_components/common/StatusBadge.tsx
export function StatusBadge({ status, variant = 'default' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <div className={cn(
      "px-3 py-1.5 rounded-full text-xs font-semibold border",
      config.className
    )}>
      {config.label}
    </div>
  );
}
```

#### 4. Pagination Controls (Duplicated 3+ times)

```typescript
// ✅ GOOD: Create app/_components/common/PaginationControls.tsx
export function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationControlsProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        Previous
      </Button>
      <span>Page {currentPage} of {totalPages}</span>
      <Button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next
      </Button>
    </div>
  );
}
```

#### 5. Smart Navigation Hook (Duplicated in 2+ files)

```typescript
// ✅ GOOD: Create app/_hooks/useSmartNavigation.ts
export function useSmartNavigation() {
  const router = useRouter();

  return useCallback((url: string) => (e: React.MouseEvent) => {
    const isModifierClick = e.ctrlKey || e.metaKey;
    const isMiddleClick = e.button === 1;

    if (isModifierClick || isMiddleClick) {
      e.preventDefault();
      const newWindow = window.open(url, '_blank');
      if (newWindow && !e.shiftKey) {
        newWindow.blur();
        window.focus();
      }
    } else {
      e.preventDefault();
      router.push(url);
    }
  }, [router]);
}

// Usage
const handleNavigate = useSmartNavigation();
<div onClick={handleNavigate('/some-url')}>Click me</div>
```

---

## Target Component Architecture

```
app/_components/
├── cards/
│   ├── ContentCard/
│   │   ├── index.tsx              # Main (~100 lines)
│   │   ├── ContentCardHover.tsx   # Hover UI (~80 lines)
│   │   └── useContentCard.ts      # Logic (~60 lines)
│   ├── ListCard/
│   │   ├── index.tsx
│   │   └── useListCard.ts
│   └── base/
│       ├── BaseCard.tsx           # Shared foundation
│       └── CardImage.tsx          # Reusable image
│
├── common/
│   ├── StatusBadge.tsx            # Status component
│   ├── PaginationControls.tsx    # Pagination
│   ├── LoadingCarousel.tsx        # Loading states
│   ├── ErrorBoundary.tsx          # Error handling
│   └── SearchResults/
│       ├── index.tsx
│       └── SearchResultsSection.tsx
│
├── pages/
│   ├── ListDetailPage/
│   │   ├── index.tsx                    # Orchestrator (~150 lines)
│   │   ├── hooks/
│   │   │   ├── useListData.ts          # Data fetching (~50)
│   │   │   ├── useListReordering.ts    # DnD (~80)
│   │   │   ├── useListPagination.ts    # Pagination (~40)
│   │   │   ├── useListGrouping.ts      # Grouping (~60)
│   │   │   └── useListItemActions.ts   # CRUD (~70)
│   │   ├── components/
│   │   │   ├── ListHeader.tsx          # (~80)
│   │   │   ├── ListStats.tsx           # (~50)
│   │   │   ├── ListActions.tsx         # (~60)
│   │   │   ├── ViewModeToggle.tsx      # (~40)
│   │   │   ├── GroupHeader.tsx         # (~70)
│   │   │   ├── ListView/
│   │   │   │   ├── index.tsx
│   │   │   │   ├── FlatListView.tsx
│   │   │   │   └── GroupedListView.tsx
│   │   │   └── GalleryView/
│   │   │       ├── index.tsx
│   │   │       ├── FlatGalleryView.tsx
│   │   │       └── GroupedGalleryView.tsx
│   │   └── utils.ts                    # Pure functions
│   │
│   ├── ContentDetailPage/
│   │   ├── index.tsx                    # Orchestrator (~120)
│   │   ├── hooks/
│   │   │   ├── useContentData.ts       # Fetching (~80)
│   │   │   └── useUserRating.ts        # Rating (~50)
│   │   ├── components/
│   │   │   ├── ContentHeader.tsx
│   │   │   ├── RatingsSection.tsx
│   │   │   ├── TracksSection.tsx
│   │   │   ├── SeasonsSection.tsx
│   │   │   ├── GallerySection.tsx
│   │   │   └── ApiAttribution.tsx
│   │   └── content-types/
│   │
│   ├── SearchPage/
│   │   ├── index.tsx                    # (~120)
│   │   ├── hooks/
│   │   │   └── useSearchDebounce.ts
│   │   └── components/
│   │       ├── SearchInput.tsx
│   │       └── SearchResultsCarousel.tsx
│   │
│   └── HomePage/
│       ├── index.tsx
│       └── components/
│           ├── HeroSection.tsx
│           └── ContentCarousels.tsx
│
└── _hooks/
    ├── useApi.ts                  # Existing
    ├── useAuth.ts                 # Existing
    ├── useSmartNavigation.ts      # NEW: Click handling
    ├── useContentNavigation.ts    # NEW: Content navigation
    └── useHoverPopover.ts         # NEW: From Card

lib/
└── utils/
    ├── navigationUtils.ts         # NEW: URL construction
    ├── contentTypeUtils.ts        # NEW: SourceApi mapping
    ├── dateUtils.ts               # Existing
    └── formatUtils.ts             # Existing
```

---

## TypeScript Best Practices - STRICT MODE

### 1. Type Safety (NO EXCEPTIONS)

```typescript
// ❌ FORBIDDEN: Using 'any'
function handleClick(data: any) {
  console.log(data.id);
}

// ✅ REQUIRED: Proper types
interface ClickData {
  id: string;
  type: ContentType;
}

function handleClick(data: ClickData) {
  console.log(data.id);
}
```

### 2. Avoid Type Assertions

```typescript
// ❌ BAD: Type assertion
const user = data as User;

// ✅ GOOD: Type guard
function isUser(data: unknown): data is User {
  return typeof data === 'object' && data !== null && 'id' in data;
}

if (isUser(data)) {
  console.log(data.id);
}
```

### 3. Use Discriminated Unions

```typescript
// ✅ GOOD: Type-safe content handling
type Content =
  | { type: 'MOVIE'; runtime: number }
  | { type: 'TV_SHOW'; seasons: number }
  | { type: 'GAME'; platforms: string[] };

function renderContent(content: Content) {
  switch (content.type) {
    case 'MOVIE':
      return content.runtime; // TypeScript knows this exists
    case 'TV_SHOW':
      return content.seasons; // TypeScript knows this exists
    case 'GAME':
      return content.platforms; // TypeScript knows this exists
  }
}
```

---

## Next.js App Router Best Practices

### 1. Server vs Client Components

```typescript
// ✅ GOOD: Server component (default)
// app/lists/[id]/page.tsx
export default async function ListPage({ params }: Props) {
  const list = await fetchList(params.id);
  return <ListDetailPage list={list} />;
}

// ✅ GOOD: Client component (when needed)
// app/_components/pages/ListDetailPage/index.tsx
'use client';

export default function ListDetailPage({ list }: Props) {
  const [items, setItems] = useState(list.items);
  return <div>...</div>;
}
```

### 2. Data Fetching Patterns

```typescript
// ✅ GOOD: Server-side when possible
export default async function ContentPage({ searchParams }: Props) {
  const content = await fetchContent({
    external_id: searchParams.external_id,
    source_api: searchParams.source_api,
  });
  return <ContentDetailPage content={content} />;
}

// ✅ GOOD: Client-side for interactive data
'use client';

export default function ContentDetailPage({ initialContent }: Props) {
  const { data } = useApi({
    url: `/content/${initialContent.id}`,
    initialData: initialContent,
  });
  return <div>...</div>;
}
```

---

## React Best Practices

### 1. Extract Logic to Custom Hooks

```typescript
// ✅ GOOD: Custom hook for complex logic
export function useListReordering(listId: string) {
  const [draggedItem, setDraggedItem] = useState<ListItem | null>(null);
  const { mutate: reorderItems } = useApi(...);

  const handleDragStart = useCallback((item: ListItem) => {
    setDraggedItem(item);
  }, []);

  const handleDragEnd = useCallback(async (targetIndex: number) => {
    if (!draggedItem) return;
    await reorderItems({ itemId: draggedItem.id, targetIndex });
    setDraggedItem(null);
  }, [draggedItem, reorderItems]);

  return { draggedItem, handleDragStart, handleDragEnd };
}
```

### 2. Memoization

```typescript
// ✅ GOOD: Memoize expensive computations
const groupedItems = useMemo(() => {
  return groupItemsByStatus(items);
}, [items]);

// ✅ GOOD: Memoize callbacks
const handleItemClick = useCallback((itemId: string) => {
  router.push(`/items/${itemId}`);
}, [router]);
```

### 3. Composition over Props Drilling

```typescript
// ❌ BAD: Props drilling
<Parent>
  <Child1 user={user} theme={theme} settings={settings} />
  <Child2 user={user} theme={theme} settings={settings} />
</Parent>

// ✅ GOOD: Context
const { user, theme, settings } = useAppContext();
```

---

## Mandatory Code Review Checklist

Before completing ANY component:

**Component Size:**
- [ ] Under 200 lines (MANDATORY)
- [ ] Single responsibility
- [ ] Logic in custom hooks
- [ ] Reusable UI in sub-components

**DRY Compliance:**
- [ ] No code duplication from other files
- [ ] No code duplication within file
- [ ] Utilities in lib/utils/
- [ ] Common components in app/_components/common/

**Type Safety:**
- [ ] No 'any' types
- [ ] No type assertions
- [ ] Proper interfaces
- [ ] Discriminated unions

**Performance:**
- [ ] useMemo for expensive operations
- [ ] useCallback for callbacks
- [ ] No unnecessary re-renders
- [ ] Next.js Image optimization

**Accessibility:**
- [ ] Semantic HTML
- [ ] ARIA labels
- [ ] Keyboard navigation
- [ ] Focus management

---

## Refactoring Priority Levels

**Priority 1 - IMMEDIATE:**
- Components over 300 lines
- Code duplicated 3+ times
- Using 'any' type

**Priority 2 - SOON:**
- Components over 200 lines
- Code duplicated 2 times
- Logic not in hooks

**Priority 3 - WHEN TOUCHING:**
- Components 150-200 lines
- Minor DRY violations
- Optimization opportunities

---

## The Golden Rules - MEMORIZE THESE

1. **NEVER** create components over 200 lines
2. **NEVER** repeat code more than once
3. **ALWAYS** extract logic to custom hooks
4. **ALWAYS** extract reusable UI to sub-components
5. **ALWAYS** use proper TypeScript types (never 'any')
6. **ALWAYS** follow Single Responsibility Principle
7. **ALWAYS** check for existing utilities first
8. **ALWAYS** create utilities for shared logic
9. **ALWAYS** use composition over inheritance
10. **ALWAYS** write self-documenting code

**Core Philosophy:** Clean code is about clarity and maintainability, not cleverness.
