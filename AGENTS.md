# AI Agent Guidelines for Cursor

This document provides comprehensive guidelines for AI assistants (specifically Cursor) working with this Next.js codebase. These guidelines are **MANDATORY** and override any default behaviors.

---

## Project Context

**Framework**: Next.js 16.0.0 with App Router
**Language**: TypeScript (Strict Mode)
**Styling**: Tailwind CSS v4
**State**: Zustand with persistence
**Backend**: Django REST API (JWT auth)

---

## CRITICAL RULE #1: MINIMAL COMMENTING POLICY

### The Golden Rule of Comments

**CODE MUST BE SELF-EXPLANATORY. Comments are a code smell indicating poor naming or structure.**

### When Comments Are FORBIDDEN

❌ **NEVER** add comments for:
- Variable declarations with clear names
- Function calls that are self-explanatory
- Simple conditionals or loops
- Obvious return statements
- Standard React patterns (useState, useEffect, etc.)
- Import statements
- Interface/type definitions with clear names

**Examples of FORBIDDEN comments:**

```typescript
// ❌ BAD: Unnecessary comments
// Set the user state
const [user, setUser] = useState<User | null>(null);

// Fetch data from API
const data = await fetchContent(id);

// Check if user is logged in
if (user) {
  // Navigate to dashboard
  router.push('/dashboard');
}

// Return the component
return <div>...</div>;
```

**Examples of GOOD self-documenting code:**

```typescript
// ✅ GOOD: No comments needed
const [user, setUser] = useState<User | null>(null);
const content = await fetchContent(contentId);
const isAuthenticated = Boolean(user);

if (isAuthenticated) {
  router.push('/dashboard');
}

return <ContentCard content={content} />;
```

### When Comments Are ALLOWED (Rare Cases Only)

✅ Comments are **ONLY** acceptable for:

1. **Complex algorithms or business logic**
   ```typescript
   // ✅ ACCEPTABLE: Explains WHY, not WHAT
   // TMDB API requires rate limiting: max 40 requests/10 seconds
   // We batch requests and delay to stay under this limit
   await batchWithRateLimit(requests, { maxPerWindow: 40, windowMs: 10000 });
   ```

2. **Non-obvious workarounds or hacks**
   ```typescript
   // ✅ ACCEPTABLE: Explains unexpected solution
   // Safari doesn't support IntersectionObserver with sticky elements
   // Using scroll event as fallback for iOS devices
   useEffect(() => {
     if (isSafari) {
       window.addEventListener('scroll', handleStickyScroll);
     }
   }, []);
   ```

3. **Performance optimizations**
   ```typescript
   // ✅ ACCEPTABLE: Explains performance decision
   // Virtualization required: lists can contain 1000+ items
   // Rendering all items causes 5+ second lag on mobile devices
   return <VirtualizedList items={items} />;
   ```

4. **Security considerations**
   ```typescript
   // ✅ ACCEPTABLE: Documents security reasoning
   // Input sanitization prevents XSS attacks via user-generated list descriptions
   // Backend also validates, but client-side prevents most injection attempts
   const sanitizedDescription = DOMPurify.sanitize(userInput);
   ```

5. **JSDoc for public API/reusable components** (concise only)
   ```typescript
   /**
    * Reusable card component for displaying content items.
    * Handles hover states, navigation, and external API attribution.
    */
   export function ContentCard({ content, variant = 'default' }: ContentCardProps) {
     // ...
   }
   ```

### How to Eliminate Comments

Instead of commenting, use these techniques:

1. **Extract to well-named functions**
   ```typescript
   // ❌ BAD
   // Calculate average rating from all user ratings
   const avg = ratings.reduce((sum, r) => sum + r.value, 0) / ratings.length;

   // ✅ GOOD
   const averageRating = calculateAverageRating(ratings);

   function calculateAverageRating(ratings: Rating[]): number {
     if (ratings.length === 0) return 0;
     const sum = ratings.reduce((total, rating) => total + rating.value, 0);
     return sum / ratings.length;
   }
   ```

2. **Use descriptive variable names**
   ```typescript
   // ❌ BAD
   const d = new Date(); // Current date
   const ms = d.getTime(); // Milliseconds since epoch
   const s = ms / 1000; // Convert to seconds

   // ✅ GOOD
   const currentDate = new Date();
   const millisecondsSinceEpoch = currentDate.getTime();
   const secondsSinceEpoch = millisecondsSinceEpoch / 1000;
   ```

3. **Extract complex conditions to well-named variables**
   ```typescript
   // ❌ BAD
   // Check if content is completed and rated
   if (item.status === 'COMPLETED' && item.rating && item.rating > 0) {
     // ...
   }

   // ✅ GOOD
   const isCompletedAndRated = (
     item.status === 'COMPLETED' &&
     item.rating !== null &&
     item.rating > 0
   );

   if (isCompletedAndRated) {
     // ...
   }
   ```

4. **Use TypeScript types as documentation**
   ```typescript
   // ❌ BAD
   // User object containing authentication data
   interface User {
     id: string; // Unique identifier
     email: string; // User's email address
     name: string; // Display name
   }

   // ✅ GOOD
   interface AuthenticatedUser {
     userId: string;
     emailAddress: string;
     displayName: string;
   }
   ```

### Comment Review Checklist

Before adding ANY comment, ask:
- [ ] Can I rename variables/functions to make this clearer?
- [ ] Can I extract this to a well-named function?
- [ ] Can I use TypeScript types to document this?
- [ ] Is this comment explaining WHAT (bad) or WHY (potentially good)?
- [ ] Would this be obvious to another developer reading the code?

**If you answer YES to any of the first 3 questions, DO NOT add the comment. Refactor instead.**

---

## CRITICAL RULE #2: COMPONENT SIZE LIMITS (MANDATORY)

### Absolute Line Limits

- ✅ **Maximum: 200 lines** per component file (HARD LIMIT)
- ✅ **Recommended: 150 lines** for optimal maintainability
- ❌ **FORBIDDEN: 300+ lines** (MUST refactor immediately)
- 🚨 **Components over 200 lines are considered BROKEN CODE**

### Enforcement

When you encounter a component over 200 lines:
1. **STOP immediately**
2. **Refuse to add features** to oversized components
3. **Require refactoring first** before making changes
4. **Extract logic to custom hooks**
5. **Extract UI to sub-components**

### Line Count Includes

- Imports
- Type definitions
- Component logic
- Return statement (JSX)
- Exports

**Does NOT include:** Blank lines (but don't abuse spacing to game the system)

---

## CRITICAL RULE #3: SOLID PRINCIPLES (MANDATORY)

### 1. Single Responsibility Principle (SRP)

**Every component, function, and module has exactly ONE reason to change.**

**Component Purpose Test**: Can you describe the component in 5 words or less?
- ✅ "Displays content card with hover"
- ✅ "Manages list item reordering"
- ❌ "Handles list page data, UI, modals, pagination, grouping, sorting..." (too many responsibilities)

**Validation Checklist**:
- [ ] Component has one clear purpose
- [ ] Under 200 lines
- [ ] Complex logic in custom hooks
- [ ] Reusable UI in sub-components
- [ ] No business logic mixed with rendering

**Example Structure**:

```typescript
// ✅ GOOD: Single Responsibility Applied

// File: ListDetailPage/index.tsx (~120 lines)
// Responsibility: Orchestration and composition only
export default function ListDetailPage({ listId }: Props) {
  const listData = useListData(listId);           // Data fetching
  const reordering = useListReordering(listId);   // Drag-and-drop
  const pagination = useListPagination(items);     // Pagination
  const grouping = useListGrouping(items);         // Grouping
  const modals = useListModals();                  // Modals

  return (
    <div>
      <ListHeader list={listData.list} />
      <ListContent items={pagination.currentItems} />
      <ListModals {...modals} />
    </div>
  );
}

// File: hooks/useListData.ts (~50 lines)
// Responsibility: Data fetching ONLY
export function useListData(listId: string) {
  const { data, isLoading, error } = useApi({
    url: `/lists/${listId}`,
    requiresAuth: true,
  });

  return { list: data, isLoading, error };
}

// File: hooks/useListReordering.ts (~80 lines)
// Responsibility: Reordering logic ONLY
export function useListReordering(listId: string) {
  const [draggedItem, setDraggedItem] = useState<ListItem | null>(null);

  const handleDragStart = useCallback((item: ListItem) => {
    setDraggedItem(item);
  }, []);

  const handleDragEnd = useCallback(async (targetIndex: number) => {
    // Reordering logic only
  }, []);

  return { draggedItem, handleDragStart, handleDragEnd };
}
```

---

### 2. Open/Closed Principle (OCP)

**Components are open for extension, closed for modification.**

Use configuration objects, render props, or composition instead of if/else chains.

```typescript
// ❌ BAD: Requires modification for new types
function ContentCard({ content }: Props) {
  if (content.type === 'MOVIE') {
    return <MovieCard content={content} />;
  } else if (content.type === 'TV_SHOW') {
    return <TVShowCard content={content} />;
  }
  // Adding new type = modifying this file
}

// ✅ GOOD: Extensible via configuration
const CONTENT_RENDERERS: Record<ContentType, ComponentType> = {
  MOVIE: MovieCard,
  TV_SHOW: TVShowCard,
  GAME: GameCard,
  // Adding new type = just add to this map
};

function ContentCard({ content }: Props) {
  const Renderer = CONTENT_RENDERERS[content.type];
  return <Renderer content={content} />;
}
```

---

### 3. Liskov Substitution Principle (LSP)

**Subtypes must be substitutable for their base types.**

All variants of a component type must implement the same interface.

```typescript
// ✅ GOOD: All cards implement CardProps
interface CardProps {
  title: string;
  image: string;
  onClick: () => void;
}

export function MovieCard(props: CardProps) { /* ... */ }
export function TVShowCard(props: CardProps) { /* ... */ }
export function GameCard(props: CardProps) { /* ... */ }

// All are interchangeable
function renderCard(Card: ComponentType<CardProps>, props: CardProps) {
  return <Card {...props} />;
}
```

---

### 4. Interface Segregation Principle (ISP)

**Don't force components to depend on props they don't use.**

Split fat interfaces into focused ones.

```typescript
// ❌ BAD: Fat interface
interface ListItemProps {
  item: ListItem;
  onEdit?: () => void;
  onDelete?: () => void;
  onRate?: () => void;
  showActions?: boolean;
  showRating?: boolean;
  enableDrag?: boolean;
  // 20+ optional props...
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

function ListItemCard({
  item,
  actions,
  interactive,
}: {
  item: ListItem;
  actions?: ListItemActionsProps;
  interactive?: ListItemInteractiveProps;
}) {
  // Only uses what it needs
}
```

---

### 5. Dependency Inversion Principle (DIP)

**Depend on abstractions, not concrete implementations.**

Use custom hooks to abstract store dependencies.

```typescript
// ❌ BAD: Direct store dependency
function MyComponent() {
  const user = useAuthStore((state) => state.user);
  // Tightly coupled to Zustand
}

// ✅ GOOD: Abstraction via custom hook
function MyComponent() {
  const { user } = useAuth();
  // Can change store implementation without touching component
}
```

---

## CRITICAL RULE #4: DRY PRINCIPLE (ZERO TOLERANCE)

### Absolute Rule

**If code appears MORE THAN ONCE, extract it IMMEDIATELY.**

### Code Duplication Is NEVER Acceptable

- ❌ Duplicating 3+ lines of logic
- ❌ Copy-pasting component JSX
- ❌ Repeating conditional logic
- ❌ Similar patterns across files

### Extraction Hierarchy

1. **Duplicated logic** → Extract to utility function (`lib/utils/`)
2. **Duplicated UI** → Extract to component (`app/_components/common/`)
3. **Duplicated hooks logic** → Extract to custom hook (`app/_hooks/`)
4. **Duplicated constants** → Extract to config file

### Examples from This Project

#### ✅ Already Extracted (GOOD):
- `buildContentUrl()` in `lib/utils/navigationUtils.ts`
- `getSourceApi()` in `lib/utils/contentTypeUtils.ts`
- `<StatusBadge />` component in `app/_components/common/StatusBadge.tsx`

#### ❌ Still Duplicated (MUST FIX):

**1. Modifier Key Click Handling** (found in 2 files)
```typescript
// Create: app/_hooks/useSmartNavigation.ts
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
```

**2. Pagination Controls** (found 3 times in ListDetailPage)
```typescript
// Create: app/_components/common/PaginationControls.tsx
export function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
}: Props) {
  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
      >
        <ChevronsLeft />
      </Button>
      <Button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <ChevronLeft />
      </Button>
      <span>{currentPage} / {totalPages}</span>
      <Button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        <ChevronRight />
      </Button>
      <Button
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
      >
        <ChevronsRight />
      </Button>
    </div>
  );
}
```

---

## TypeScript Requirements (STRICT MODE)

### 1. Type Safety (NO EXCEPTIONS)

- ✅ **ALWAYS** use explicit types for function parameters
- ✅ **ALWAYS** use explicit return types for functions
- ❌ **NEVER** use `any` type
- ❌ **NEVER** use `as any` type assertion
- ❌ **NEVER** use `@ts-ignore` or `@ts-expect-error`

```typescript
// ❌ FORBIDDEN
function handleClick(data: any) {
  console.log(data.id);
}

const user = data as any;

// @ts-ignore
const value = obj.unknownProp;

// ✅ REQUIRED
interface ClickData {
  id: string;
  type: ContentType;
}

function handleClick(data: ClickData): void {
  console.log(data.id);
}

function isUser(data: unknown): data is User {
  return typeof data === 'object' && data !== null && 'id' in data;
}

if (isUser(data)) {
  console.log(data.id); // Type-safe
}
```

### 2. Use Discriminated Unions

For content types and variants, use discriminated unions.

```typescript
// ✅ GOOD
type Content =
  | { type: 'MOVIE'; runtime: number }
  | { type: 'TV_SHOW'; seasons: number }
  | { type: 'GAME'; platforms: string[] };

function renderContent(content: Content) {
  switch (content.type) {
    case 'MOVIE':
      return `Runtime: ${content.runtime}min`; // TS knows runtime exists
    case 'TV_SHOW':
      return `Seasons: ${content.seasons}`; // TS knows seasons exists
    case 'GAME':
      return `Platforms: ${content.platforms.join(', ')}`; // TS knows platforms exists
  }
}
```

### 3. Proper Error Handling

Define error types instead of using `any` or `unknown`.

```typescript
// ❌ BAD
catch (error: any) {
  console.log(error.message);
}

// ✅ GOOD
interface ApiError {
  message: string;
  code: string;
  details?: Record<string, string[]>;
}

function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    'code' in error
  );
}

try {
  await api.fetchData();
} catch (error: unknown) {
  if (isApiError(error)) {
    console.log(error.message);
  } else {
    console.log('Unknown error occurred');
  }
}
```

---

## Next.js App Router Patterns

### 1. Server Components by Default

Use server components unless you need client-side interactivity.

```typescript
// ✅ GOOD: Server component (default)
// app/lists/[id]/page.tsx
export default async function ListPage({ params }: Props) {
  const list = await fetchList(params.id);
  return <ListDetailPage list={list} />;
}

// ✅ GOOD: Client component only when needed
// app/_components/pages/ListDetailPage/index.tsx
'use client';

export default function ListDetailPage({ list }: Props) {
  const [items, setItems] = useState(list.items);
  return <div>...</div>;
}
```

### 2. Loading and Error States

Always provide loading.tsx and error.tsx for routes.

```typescript
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

## React Best Practices

### 1. Custom Hooks for Logic Extraction

Extract ALL complex logic to custom hooks.

```typescript
// ✅ GOOD: Complex logic in custom hook
export function useListReordering(listId: string) {
  const [draggedItem, setDraggedItem] = useState<ListItem | null>(null);
  const { mutate: reorderItems } = useApi({ requiresAuth: true });

  const handleDragStart = useCallback((item: ListItem) => {
    setDraggedItem(item);
  }, []);

  const handleDragEnd = useCallback(async (targetIndex: number) => {
    if (!draggedItem) return;
    await reorderItems({
      url: `/lists/${listId}/reorder`,
      data: { itemId: draggedItem.id, targetIndex },
    });
    setDraggedItem(null);
  }, [draggedItem, listId, reorderItems]);

  return { draggedItem, handleDragStart, handleDragEnd };
}

// Usage in component
function ListDetailPage({ listId }: Props) {
  const reordering = useListReordering(listId);
  return <List onDragStart={reordering.handleDragStart} />;
}
```

### 2. Memoization

Use `useMemo` for expensive computations and `useCallback` for callbacks passed as props.

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

Use context or composition to avoid deep props drilling.

```typescript
// ❌ BAD: Props drilling 5 levels deep
<Parent user={user}>
  <Child1 user={user}>
    <Child2 user={user}>
      <Child3 user={user}>
        <Child4 user={user} />
      </Child3>
    </Child2>
  </Child1>
</Parent>

// ✅ GOOD: Context
const { user } = useAuth(); // Available at any level
```

---

## Component Organization Structure

### Recommended File Structure

```
app/_components/pages/ListDetailPage/
├── index.tsx                    # Main orchestrator (~120 lines)
├── hooks/
│   ├── useListData.ts          # Data fetching (~50 lines)
│   ├── useListReordering.ts    # Drag-and-drop (~80 lines)
│   ├── useListPagination.ts    # Pagination (~40 lines)
│   ├── useListGrouping.ts      # Grouping/sorting (~60 lines)
│   └── useListItemActions.ts   # CRUD operations (~70 lines)
├── components/
│   ├── ListHeader.tsx          # (~80 lines)
│   ├── ListStats.tsx           # (~50 lines)
│   ├── ListActions.tsx         # (~60 lines)
│   ├── ViewModeToggle.tsx      # (~40 lines)
│   ├── GroupHeader.tsx         # (~70 lines)
│   └── ListView/
│       ├── index.tsx
│       ├── FlatListView.tsx
│       └── GroupedListView.tsx
└── utils.ts                    # Pure functions only
```

---

## Mandatory Code Review Checklist

Before completing ANY component, verify ALL items:

### Component Size
- [ ] Under 200 lines (MANDATORY)
- [ ] Single responsibility (describable in 5 words)
- [ ] Complex logic in custom hooks
- [ ] Reusable UI in sub-components

### DRY Compliance
- [ ] No code duplication from other files
- [ ] No code duplication within file
- [ ] Utilities in `lib/utils/`
- [ ] Common components in `app/_components/common/`

### Type Safety
- [ ] No `any` types
- [ ] No type assertions (`as`)
- [ ] Proper interfaces for all props
- [ ] Discriminated unions for variants

### Performance
- [ ] `useMemo` for expensive computations
- [ ] `useCallback` for callbacks
- [ ] No unnecessary re-renders
- [ ] Next.js Image optimization

### Accessibility
- [ ] Semantic HTML
- [ ] ARIA labels where needed
- [ ] Keyboard navigation support
- [ ] Focus management

### Comments
- [ ] No unnecessary comments
- [ ] Code is self-documenting
- [ ] Only complex logic has comments (rare)

---

## Refactoring Priority Levels

### Priority 1: IMMEDIATE (Do First)
- Components over 300 lines
- Code duplicated 3+ times
- Using `any` type

### Priority 2: SOON (Do This Week)
- Components 200-300 lines
- Code duplicated 2 times
- Logic not extracted to hooks

### Priority 3: WHEN TOUCHING (During Feature Work)
- Components 150-200 lines
- Minor DRY violations
- Optimization opportunities

---

## The Ten Commandments (Memorize)

1. **NEVER** create components over 200 lines
2. **NEVER** repeat code more than once
3. **NEVER** use `any` type or type assertions
4. **NEVER** add unnecessary comments
5. **ALWAYS** extract complex logic to custom hooks
6. **ALWAYS** extract reusable UI to sub-components
7. **ALWAYS** follow Single Responsibility Principle
8. **ALWAYS** check for existing utilities before creating new ones
9. **ALWAYS** use composition over inheritance
10. **ALWAYS** write self-documenting code with clear names

---

## Cursor-Specific Instructions

### When Writing Code

1. **Start Small**: Components should start at ~100 lines and grow carefully
2. **Refactor Early**: If approaching 150 lines, immediately split
3. **Think Composition**: Before adding logic, consider extracting
4. **Name Clearly**: Spend time on naming to eliminate comment needs
5. **Type Strictly**: Never compromise on type safety

### When Refactoring

1. **Test First**: Understand what the code does before changing
2. **Split Incrementally**: Extract one piece at a time
3. **Keep Working**: Ensure code works after each extraction
4. **Update Imports**: Fix all import paths immediately
5. **Verify Types**: Ensure types flow correctly after split

### When Adding Features

1. **Check Size First**: If component >150 lines, refactor before adding
2. **Extract Logic**: New feature logic goes in custom hook first
3. **Reuse Components**: Use existing components from `common/` folder
4. **Follow Patterns**: Match existing architecture and naming

---

## Common Pitfalls to Avoid

### ❌ Don't Do This

1. Adding "just one more feature" to a 180-line component
2. Copy-pasting code because "it's only used twice"
3. Using `any` because "types are too complex"
4. Adding comments instead of improving names
5. Mixing business logic with UI rendering
6. Creating one massive useEffect instead of multiple focused ones
7. Accepting tech debt "to ship faster"

### ✅ Do This Instead

1. Refactor before adding features
2. Extract to utility even for 2 uses
3. Define proper types or use type guards
4. Rename variables/functions for clarity
5. Extract logic to custom hooks
6. Use multiple focused useEffects
7. Ship clean code that won't slow you down later

---

## Philosophy

**Clean code is not about being clever. It's about being clear.**

- Clear naming eliminates the need for comments
- Small components are easier to understand than large ones
- Extracted logic is easier to test than inline logic
- Shared utilities prevent bugs from spreading
- Type safety catches errors at compile time, not runtime

**Your future self (and teammates) will thank you for writing clean code today.**

---

## Questions?

If you're unsure about:
- Component size: **Split it**
- Code duplication: **Extract it**
- Unclear name: **Rename it**
- Need for comment: **Refactor it**
- Type complexity: **Define proper types**

**When in doubt, choose the cleaner, more maintainable approach.**


## Reference Implementations

### ListDetailPage - Model Refactor (COMPLETED ✅)

The ListDetailPage serves as the GOLD STANDARD for component refactoring in this project.

**Before:** 2,114 lines → **After:** 391 lines (-81.5%)

**Architecture:**
- 8 custom hooks (~685 lines total) - All business logic
- 9 sub-components (~1,200 lines total) - All UI
- 391-line orchestrator - Pure composition

**Apply this pattern to ALL components over 200 lines.**

See CLAUDE.md for complete implementation details.

**Next Targets:**
1. ContentDetailPage (802 lines → ~150 lines)
2. SearchPage (502 lines → ~120 lines)
3. HomePage (350 lines → ~120 lines)
4. AddToListModal (589 lines → ~120 lines)

---
