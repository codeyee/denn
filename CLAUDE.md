# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Running the Development Server
```bash
npm run dev
```
Starts the Next.js development server on http://localhost:3000

### Building
```bash
npm run build
```
Creates an optimized production build

### Production Server
```bash
npm run start
```
Runs the production build (requires `npm run build` first)

### Linting
```bash
npm run lint
```
Runs ESLint to check code quality

## Project Architecture

### Tech Stack
- **Framework**: Next.js 16.0.0 (App Router)
- **React**: 19.2.0
- **TypeScript**: Strict mode enabled
- **Styling**: Tailwind CSS v4 with custom breakpoints and theme
- **State Management**: Zustand with persistence
- **UI Components**: Radix UI primitives
- **Animations**: GSAP and Motion (framer-motion successor)
- **Forms**: React Hook Form with Zod validation

### Directory Structure

```
app/
├── _components/        # React components organized by type
│   ├── cards/         # Card components (ContentCard, ListCard, etc.)
│   ├── common/        # Shared components (Modal, Carousel, List, etc.)
│   ├── forms/         # Form components (LoginForm, RegisterForm)
│   ├── layout/        # Layout components (Navbar, Footer)
│   ├── lib/           # UI library components and animations
│   └── pages/         # Page-specific components
├── _hooks/            # Custom React hooks
├── _providers/        # Context providers (StoreProvider)
├── _stores/           # Zustand stores
├── api/               # API route handlers
├── [routes]/          # Next.js file-based routing
lib/
├── api/               # API client and actions
└── utils/             # Utility functions
types/                 # TypeScript type definitions
public/               # Static assets
```

### State Management

The application uses **Zustand** for state management with five main stores:

1. **auth-store.ts**: Authentication state (user, tokens, login/register/logout)
   - Persisted to localStorage
   - Handles JWT token management
   - Auto-rehydrates on app load

2. **content-store.ts**: Content data state (movies, TV shows, games, music, books)

3. **lists-store.ts**: User lists management

4. **ui-store.ts**: UI state (modals, dropdowns, etc.)

5. **settings-store.ts**: User preferences and settings

All stores are provided via `StoreProvider` in the root layout.

### API Architecture

**Backend API Base URL**: Configured via `NEXT_PUBLIC_API_URL` environment variable
- Default: `http://localhost:8000/api`
- Production: `https://denn.up.railway.app/api`

**API Client** (`lib/api/api.ts`):
- Centralized `apiRequest()` function handles all HTTP requests
- Automatic JWT token refresh on 401 responses
- Token refresh uses a singleton promise to prevent duplicate refresh calls
- Supports both authenticated and public endpoints via `requiresAuth` flag

**useApi Hook** (`app/_hooks/useApi.ts`):
- Custom hook for making API requests with loading/error states
- Provides convenience methods: `get()`, `post()`, `put()`, `patch()`, `delete()`
- Automatic auth token handling when `requiresAuth: true`

**API Actions** (`lib/api/actions.ts`):
- Server actions for data fetching

### Content Types

The application supports five content types defined in `types/contentTypes.ts`:
- Movies (TMDB)
- TV Shows (TMDB)
- Games (IGDB)
- Music Albums (Spotify)
- Books (OpenLibrary)

Each content type has its own interface with source-specific fields. Content items include:
- External API source tracking (`source_api`, `external_id`)
- User ratings and list membership
- Metadata from source APIs

### Authentication Flow

1. User submits login/register form
2. Auth store calls backend `/api/auth/login/` or `/api/auth/register/`
3. Backend returns user data + JWT tokens (access + refresh)
4. Tokens stored in auth store and persisted to localStorage
5. `apiRequest()` automatically includes Bearer token for authenticated requests
6. On 401 response, automatically refreshes token and retries request
7. On logout, calls `/api/auth/logout/` and clears all auth state

### Routing

Uses Next.js App Router with file-based routing:
- `/` - Landing page
- `/search` - Content search
- `/content` - Content detail page (with query params)
- `/lists/[id]` - List detail page
- `/profile` - User profile
- `/login`, `/register` - Auth pages

Protected routes use `ProtectedRoute` wrapper component.

### Styling System

**Tailwind CSS v4** with custom configuration:
- Custom breakpoints: 3xl through 15xl (112rem to 304rem)
- Dark mode via `next-themes` with class strategy
- Custom CSS variables for theming in `globals.css`
- Component library uses `class-variance-authority` for variant handling
- Utility function `cn()` from `lib/utils.ts` for conditional classes

**Theme Colors** are defined as CSS variables:
- Background, foreground, card, primary, secondary, muted, accent
- Custom colors: list-item-background, hero-gradient variants

### Image Handling

Next.js Image component configured for remote image sources:
- TMDB: `https://image.tmdb.org/t/p/**`
- Spotify: `https://i.scdn.co/image/**`
- IGDB: `https://images.igdb.com/igdb/image/upload/**`
- OpenLibrary: `https://covers.openlibrary.org/b/**`

### Path Aliases

TypeScript path alias configured: `@/*` maps to project root
- Import example: `@/app/_components/...`, `@/lib/api/...`, `@/types/...`

### Forms

React Hook Form + Zod for form validation:
- Schema validation using Zod
- `@hookform/resolvers` for integration
- See `app/_components/forms/` for examples

### Component Patterns

**Page Components** (`app/_components/pages/`):
- Each major page has a dedicated folder
- Contains page-specific components and logic
- Examples: ContentDetailPage, ListDetailPage, HomePage

**Card Components** (`app/_components/cards/`):
- Reusable content display cards
- ContentCard, ListCard, EpisodeCard, etc.

**Common Components** (`app/_components/common/`):
- Shared across multiple pages
- Modal, Carousel, List, Rating, Dropdown, etc.

**UI Library** (`app/_components/lib/`):
- Base UI primitives and animations
- Radix UI wrappers (button, dialog, tabs, etc.)
- Animation components (BlurText, GradientText, Noise)

## Environment Variables

Required environment variables:
- `NEXT_PUBLIC_API_URL`: Backend API base URL

---

## CODE QUALITY GUIDELINES - MANDATORY

### SOLID Principles (CRITICAL - ALWAYS ENFORCE)

#### 1. Single Responsibility Principle (SRP) - HIGHEST PRIORITY
**Rule:** Each component, function, and module must have ONE and ONLY ONE reason to change.

**Component Size Limits (STRICT):**
- ✅ **Maximum 200 lines** per component file (including imports/exports)
- ✅ **Maximum 150 lines** preferred for optimal maintainability
- ❌ **NEVER** create components over 300 lines
- 🚨 **If a component exceeds 200 lines, it MUST be refactored immediately**

**How to Apply SRP:**

```typescript
// ❌ BAD: Component doing too many things
export default function ListDetailPage() {
  // Data fetching
  const { data } = useApi(...);

  // Drag and drop logic
  const handleDragStart = () => {...};
  const handleDragEnd = () => {...};

  // Pagination logic
  const [currentPage, setCurrentPage] = useState(1);
  const handlePageChange = () => {...};

  // Grouping logic
  const groupedItems = useMemo(() => {...}, []);

  // Modal management
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Rendering 2000+ lines of JSX
  return <div>...</div>;
}

// ✅ GOOD: Split into focused components and hooks
// File: ListDetailPage/index.tsx (~100 lines)
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

// File: ListDetailPage/hooks/useListData.ts (~50 lines)
export function useListData(listId: string) {
  // Only data fetching logic
}

// File: ListDetailPage/hooks/useListReordering.ts (~80 lines)
export function useListReordering(listId: string) {
  // Only drag-and-drop logic
}

// File: ListDetailPage/components/ListHeader.tsx (~80 lines)
export function ListHeader({ list }: Props) {
  // Only header rendering
}

// File: ListDetailPage/components/ListContent.tsx (~120 lines)
export function ListContent({ items, grouping, reordering }: Props) {
  // Only content rendering with view modes
}
```

**SRP Checklist for Components:**
- [ ] Component has a single, clear purpose (described in 5 words or less)
- [ ] Component is under 200 lines
- [ ] All complex logic is extracted to custom hooks
- [ ] All reusable UI pieces are extracted to sub-components
- [ ] No business logic mixed with rendering logic

---

#### 2. Open/Closed Principle (OCP)
**Rule:** Components should be open for extension but closed for modification.

```typescript
// ❌ BAD: Hard-coded content type handling
function ContentCard({ content }: Props) {
  if (content.type === 'MOVIE') {
    return <div>{content.title} - {content.runtime}</div>;
  } else if (content.type === 'TV_SHOW') {
    return <div>{content.title} - {content.seasons}</div>;
  } else if (content.type === 'GAME') {
    return <div>{content.title} - {content.platforms}</div>;
  }
  // Adding a new type requires modifying this component
}

// ✅ GOOD: Extensible via composition
function ContentCard({ content, renderer }: Props) {
  return (
    <Card>
      <CardHeader>{content.title}</CardHeader>
      <CardContent>{renderer(content)}</CardContent>
    </Card>
  );
}

// Or use content-type-specific components
const CONTENT_RENDERERS: Record<ContentType, ComponentType> = {
  MOVIE: MovieDetails,
  TV_SHOW: TVShowDetails,
  GAME: GameDetails,
  // Adding new type doesn't modify existing code
};
```

---

#### 3. Liskov Substitution Principle (LSP)
**Rule:** Subtypes must be substitutable for their base types.

```typescript
// ✅ GOOD: All card components implement same interface
interface CardProps {
  title: string;
  image: string;
  onClick: () => void;
}

export function MovieCard(props: CardProps) { /* ... */ }
export function TVShowCard(props: CardProps) { /* ... */ }
export function GameCard(props: CardProps) { /* ... */ }

// All cards can be used interchangeably
function renderCard(CardComponent: ComponentType<CardProps>, props: CardProps) {
  return <CardComponent {...props} />;
}
```

---

#### 4. Interface Segregation Principle (ISP)
**Rule:** Don't force components to depend on props they don't use.

```typescript
// ❌ BAD: Fat interface
interface ListItemProps {
  item: ListItem;
  onEdit: () => void;
  onDelete: () => void;
  onRate: () => void;
  onMove: () => void;
  onShare: () => void;
  showActions: boolean;
  showRating: boolean;
  showStatus: boolean;
  enableDrag: boolean;
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

interface ListItemInteractiveProps {
  onRate: () => void;
  enableDrag: boolean;
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

#### 5. Dependency Inversion Principle (DIP)
**Rule:** Depend on abstractions, not concretions.

```typescript
// ❌ BAD: Direct dependency on Zustand store
function MyComponent() {
  const user = useAuthStore((state) => state.user);
  const lists = useListsStore((state) => state.lists);
  // Component is tightly coupled to store implementation
}

// ✅ GOOD: Depend on custom hook abstraction
function MyComponent() {
  const { user } = useAuth(); // Abstraction over auth implementation
  const { lists } = useLists(); // Abstraction over lists implementation
  // Can change store implementation without touching component
}
```

---

### DRY Principle (Don't Repeat Yourself) - CRITICAL

**Zero Tolerance Policy:** If code appears more than ONCE, extract it immediately.

#### Common Violations to Fix:

**1. Navigation URL Construction (Found in 4+ files)**
```typescript
// ❌ BAD: Duplicated in ContentCard, ListItemCard, FeaturedBanner, ContentBanner
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

**2. SourceApi Mapping (Found in 3+ files)**
```typescript
// ❌ BAD: Repeated 27 times across files
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

export function getContentType(type: string): ContentType {
  return CONTENT_TYPE_CONFIG[type]?.contentType ?? ContentType.MOVIE;
}
```

**3. Status Badge Rendering (Found in 22+ occurrences)**
```typescript
// ❌ BAD: Same JSX repeated 22 times
<div className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
  item.status === ItemStatus.COMPLETED
    ? "bg-green-500/20 text-green-400 border border-green-500/30"
    : "bg-white/10 text-white/80 border border-white/20"
}`}>
  {item.status === ItemStatus.COMPLETED ? "COMPLETED" : "PENDING"}
</div>

// ✅ GOOD: Create app/_components/common/StatusBadge.tsx
export function StatusBadge({ status, variant = 'default' }: StatusBadgeProps) {
  return (
    <div className={cn(
      "px-3 py-1.5 rounded-full text-xs font-semibold",
      statusVariants({ status, variant })
    )}>
      {STATUS_LABELS[status]}
    </div>
  );
}
```

**4. Pagination Controls (Duplicated 3+ times)**
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

**5. Modifier Key Click Handling (Duplicated in 2+ files)**
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

**6. Loading Placeholder Sections (Duplicated 5+ times)**
```typescript
// ✅ GOOD: Create app/_components/common/LoadingCarousel.tsx
export function LoadingCarousel({ title, count = 6 }: Props) {
  return (
    <section className="mb-4 md:mb-8">
      <Carousel title={title} items={[]} isLoading>
        {Array.from({ length: count }).map((_, index) => (
          <PlaceholderCard key={`${title}-placeholder-${index}`} index={index} />
        ))}
      </Carousel>
    </section>
  );
}
```

---

### Component Organization Rules

#### Target Architecture Structure

```
app/_components/
├── cards/
│   ├── ContentCard/
│   │   ├── index.tsx              # Main component (~100 lines)
│   │   ├── ContentCardHover.tsx   # Hover state UI (~80 lines)
│   │   └── useContentCard.ts      # Card logic hook (~60 lines)
│   ├── ListCard/
│   │   ├── index.tsx
│   │   └── useListCard.ts
│   └── base/
│       ├── BaseCard.tsx           # Shared card foundation
│       └── CardImage.tsx          # Reusable image component
│
├── common/
│   ├── StatusBadge.tsx            # Status badge component
│   ├── PaginationControls.tsx    # Reusable pagination
│   ├── LoadingCarousel.tsx        # Loading state carousel
│   ├── ErrorBoundary.tsx          # Error handling
│   └── SearchResults/
│       ├── index.tsx
│       └── SearchResultsSection.tsx
│
├── pages/
│   ├── ListDetailPage/
│   │   ├── index.tsx                    # Main orchestrator (~150 lines)
│   │   ├── hooks/
│   │   │   ├── useListData.ts          # Data fetching (~50 lines)
│   │   │   ├── useListReordering.ts    # DnD logic (~80 lines)
│   │   │   ├── useListPagination.ts    # Pagination state (~40 lines)
│   │   │   ├── useListGrouping.ts      # Grouping logic (~60 lines)
│   │   │   └── useListItemActions.ts   # CRUD operations (~70 lines)
│   │   ├── components/
│   │   │   ├── ListHeader.tsx          # (~80 lines)
│   │   │   ├── ListStats.tsx           # (~50 lines)
│   │   │   ├── ListActions.tsx         # (~60 lines)
│   │   │   ├── ViewModeToggle.tsx      # (~40 lines)
│   │   │   ├── GroupHeader.tsx         # (~70 lines)
│   │   │   ├── ListView/
│   │   │   │   ├── index.tsx
│   │   │   │   ├── FlatListView.tsx
│   │   │   │   └── GroupedListView.tsx
│   │   │   └── GalleryView/
│   │   │       ├── index.tsx
│   │   │       ├── FlatGalleryView.tsx
│   │   │       └── GroupedGalleryView.tsx
│   │   └── utils.ts                    # Pure functions (keep existing)
│   │
│   ├── ContentDetailPage/
│   │   ├── index.tsx                    # Main orchestrator (~120 lines)
│   │   ├── hooks/
│   │   │   ├── useContentData.ts       # Data fetching (~80 lines)
│   │   │   └── useUserRating.ts        # Rating state (~50 lines)
│   │   ├── components/
│   │   │   ├── ContentHeader.tsx
│   │   │   ├── RatingsSection.tsx
│   │   │   ├── TracksSection.tsx
│   │   │   ├── SeasonsSection.tsx
│   │   │   ├── GallerySection.tsx
│   │   │   └── ApiAttribution.tsx
│   │   └── content-types/              # Keep existing structure
│   │
│   ├── SearchPage/
│   │   ├── index.tsx                    # (~120 lines)
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

├── _hooks/
│   ├── useApi.ts                  # Keep existing
│   ├── useAuth.ts                 # Keep existing
│   ├── useSmartNavigation.ts      # NEW: Click handling
│   ├── useContentNavigation.ts    # NEW: Content URL navigation
│   └── useHoverPopover.ts         # NEW: Extracted from Card

└── lib/
    ├── utils/
    │   ├── navigationUtils.ts     # NEW: URL construction
    │   ├── contentTypeUtils.ts    # NEW: SourceApi mapping
    │   ├── dateUtils.ts           # Keep existing
    │   └── formatUtils.ts         # Keep existing
```

---

### TypeScript Best Practices

#### 1. Type Safety (STRICT)
```typescript
// ❌ BAD: Using 'any'
function handleClick(data: any) {
  console.log(data.id); // No type safety
}

// ✅ GOOD: Proper typing
interface ClickData {
  id: string;
  type: ContentType;
}

function handleClick(data: ClickData) {
  console.log(data.id); // Type-safe
}
```

#### 2. Avoid Type Assertions
```typescript
// ❌ BAD: Type assertion
const user = data as User;

// ✅ GOOD: Type guard
function isUser(data: unknown): data is User {
  return typeof data === 'object' && data !== null && 'id' in data;
}

if (isUser(data)) {
  console.log(data.id); // Type-safe
}
```

#### 3. Use Discriminated Unions
```typescript
// ✅ GOOD: Discriminated unions for content types
type Content =
  | { type: 'MOVIE'; runtime: number }
  | { type: 'TV_SHOW'; seasons: number }
  | { type: 'GAME'; platforms: string[] };

function renderContent(content: Content) {
  switch (content.type) {
    case 'MOVIE':
      return content.runtime; // TypeScript knows runtime exists
    case 'TV_SHOW':
      return content.seasons; // TypeScript knows seasons exists
    case 'GAME':
      return content.platforms; // TypeScript knows platforms exists
  }
}
```

---

### Next.js App Router Best Practices

#### 1. Server vs Client Components
```typescript
// ✅ GOOD: Use server components by default
// app/lists/[id]/page.tsx
export default async function ListPage({ params }: Props) {
  const list = await fetchList(params.id); // Fetch on server
  return <ListDetailPage list={list} />;
}

// ✅ GOOD: Use 'use client' only when needed
// app/_components/pages/ListDetailPage/index.tsx
'use client';

export default function ListDetailPage({ list }: Props) {
  const [items, setItems] = useState(list.items); // Client state
  return <div>...</div>;
}
```

#### 2. Data Fetching Patterns
```typescript
// ✅ GOOD: Fetch in server components when possible
// app/content/page.tsx
export default async function ContentPage({ searchParams }: Props) {
  const content = await fetchContent({
    external_id: searchParams.external_id,
    source_api: searchParams.source_api,
  });

  return <ContentDetailPage content={content} />;
}

// ✅ GOOD: Use client-side fetching for interactive data
// app/_components/pages/ContentDetailPage/index.tsx
'use client';

export default function ContentDetailPage({ initialContent }: Props) {
  const { data: content } = useApi({
    url: `/content/${initialContent.id}`,
    initialData: initialContent,
  });

  return <div>...</div>;
}
```

#### 3. Loading and Error States
```typescript
// ✅ GOOD: Use loading.tsx and error.tsx
// app/lists/[id]/loading.tsx
export default function Loading() {
  return <ListDetailSkeleton />;
}

// app/lists/[id]/error.tsx
'use client';

export default function Error({ error, reset }: ErrorProps) {
  return <ErrorBoundary error={error} reset={reset} />;
}
```

---

### React Best Practices

#### 1. Custom Hooks for Logic Extraction
```typescript
// ✅ GOOD: Extract complex logic to custom hooks
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

#### 2. Memoization
```typescript
// ✅ GOOD: Memoize expensive computations
const groupedItems = useMemo(() => {
  return groupItemsByStatus(items);
}, [items]);

// ✅ GOOD: Memoize callbacks passed as props
const handleItemClick = useCallback((itemId: string) => {
  router.push(`/items/${itemId}`);
}, [router]);
```

#### 3. Component Composition over Props Drilling
```typescript
// ❌ BAD: Props drilling
<Parent>
  <Child1 user={user} theme={theme} settings={settings} />
  <Child2 user={user} theme={theme} settings={settings} />
</Parent>

// ✅ GOOD: Context for shared state
const { user, theme, settings } = useAppContext();
```

---

### Code Review Checklist

Before considering any component complete, verify:

**Component Size:**
- [ ] Component is under 200 lines (MANDATORY)
- [ ] Component has single responsibility
- [ ] Complex logic extracted to hooks
- [ ] Reusable UI extracted to sub-components

**DRY Compliance:**
- [ ] No duplicated code from other files
- [ ] No duplicated code within file
- [ ] Utilities extracted to lib/utils/
- [ ] Common components extracted to app/_components/common/

**Type Safety:**
- [ ] No 'any' types
- [ ] No type assertions (as)
- [ ] Proper interfaces for all props
- [ ] Discriminated unions for variants

**Performance:**
- [ ] Expensive computations memoized (useMemo)
- [ ] Callbacks memoized (useCallback)
- [ ] No unnecessary re-renders
- [ ] Images optimized with Next.js Image

**Accessibility:**
- [ ] Semantic HTML
- [ ] ARIA labels where needed
- [ ] Keyboard navigation support
- [ ] Focus management

**Testing Readiness:**
- [ ] Component is easily testable
- [ ] Logic separated from UI
- [ ] No hard-coded dependencies

---

### Refactoring Priority

When you encounter code that violates these principles:

**Priority 1 (Fix Immediately):**
- Components over 300 lines
- Code duplicated 3+ times
- Missing type safety (using 'any')

**Priority 2 (Fix Soon):**
- Components over 200 lines
- Code duplicated 2 times
- Complex logic not extracted to hooks

**Priority 3 (Refactor When Touching):**
- Components 150-200 lines
- Minor DRY violations
- Improvement opportunities

---

### Examples of Well-Structured Components

**Example 1: Simple Component (~80 lines)**
```typescript
// app/_components/common/StatusBadge.tsx
import { cn } from '@/lib/utils';
import { ItemStatus } from '@/types/contentTypes';

const STATUS_CONFIG = {
  [ItemStatus.COMPLETED]: {
    label: 'Completed',
    className: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  [ItemStatus.PENDING]: {
    label: 'Pending',
    className: 'bg-white/10 text-white/80 border-white/20',
  },
} as const;

interface StatusBadgeProps {
  status: ItemStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div className={cn(
      "px-3 py-1.5 rounded-full text-xs font-semibold border",
      config.className,
      className
    )}>
      {config.label}
    </div>
  );
}
```

**Example 2: Page Component with Hooks (~120 lines)**
```typescript
// app/_components/pages/ListDetailPage/index.tsx
'use client';

import { ListHeader } from './components/ListHeader';
import { ListContent } from './components/ListContent';
import { ListModals } from './components/ListModals';
import { useListData } from './hooks/useListData';
import { useListReordering } from './hooks/useListReordering';
import { useListPagination } from './hooks/useListPagination';
import { useListGrouping } from './hooks/useListGrouping';
import { useListModals } from './hooks/useListModals';

interface ListDetailPageProps {
  listId: string;
}

export default function ListDetailPage({ listId }: ListDetailPageProps) {
  // Custom hooks handle all complex logic
  const { list, items, isLoading, error } = useListData(listId);
  const reordering = useListReordering(listId);
  const pagination = useListPagination(items);
  const grouping = useListGrouping(pagination.currentItems);
  const modals = useListModals();

  if (isLoading) return <ListDetailSkeleton />;
  if (error) return <ErrorDisplay error={error} />;
  if (!list) return <NotFound />;

  return (
    <div className="container mx-auto px-4 py-8">
      <ListHeader
        list={list}
        onEdit={modals.openEdit}
        onDelete={modals.openDelete}
      />

      <ListContent
        items={grouping.groupedItems}
        viewMode={grouping.viewMode}
        onReorder={reordering.handleReorder}
        onItemClick={modals.openRate}
      />

      <PaginationControls
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        onPageChange={pagination.setCurrentPage}
      />

      <ListModals
        isEditOpen={modals.isEditOpen}
        isDeleteOpen={modals.isDeleteOpen}
        isRateOpen={modals.isRateOpen}
        onClose={modals.closeAll}
        listId={listId}
      />
    </div>
  );
}
```

**Example 3: Custom Hook (~60 lines)**
```typescript
// app/_components/pages/ListDetailPage/hooks/useListReordering.ts
import { useState, useCallback } from 'react';
import { useApi } from '@/app/_hooks/useApi';
import type { ListItem } from '@/types/contentTypes';

export function useListReordering(listId: string) {
  const [draggedItem, setDraggedItem] = useState<ListItem | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  const { post } = useApi({
    requiresAuth: true,
  });

  const handleDragStart = useCallback((item: ListItem) => {
    setDraggedItem(item);
  }, []);

  const handleDragEnd = useCallback(async (targetIndex: number) => {
    if (!draggedItem) return;

    setIsReordering(true);

    try {
      await post(`/lists/${listId}/reorder`, {
        itemId: draggedItem.id,
        targetIndex,
      });
    } catch (error) {
      console.error('Failed to reorder items:', error);
    } finally {
      setDraggedItem(null);
      setIsReordering(false);
    }
  }, [draggedItem, listId, post]);

  const cancelDrag = useCallback(() => {
    setDraggedItem(null);
  }, []);

  return {
    draggedItem,
    isReordering,
    handleDragStart,
    handleDragEnd,
    cancelDrag,
  };
}
```

---

### Summary: The Golden Rules

1. **NEVER** create components over 200 lines
2. **NEVER** repeat code more than once
3. **ALWAYS** extract complex logic to custom hooks
4. **ALWAYS** extract reusable UI to sub-components
5. **ALWAYS** use proper TypeScript types (never 'any')
6. **ALWAYS** follow Single Responsibility Principle
7. **ALWAYS** check for existing utilities before creating new ones
8. **ALWAYS** create utility functions for shared logic
9. **ALWAYS** use composition over inheritance
10. **ALWAYS** write self-documenting code with clear names

**Remember:** Clean code is not about being clever, it's about being clear and maintainable.
