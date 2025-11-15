# Coding Standards & Best Practices - Guidelines

This document defines MANDATORY coding standards for this Next.js project. All code must comply with these standards.

---

## 📏 Component Size Limits (MANDATORY)

**STRICT Line Limits:**
- ✅ **Maximum: 200 lines** per component file (HARD LIMIT)
- ✅ **Recommended: 150 lines** for optimal maintainability
- ❌ **FORBIDDEN: 300+ lines** (MUST refactor immediately)

**Line count includes:** Imports, types, logic, JSX, exports (excludes blank lines)

**When a component exceeds 200 lines:**
1. STOP immediately
2. Extract logic to custom hooks (`hooks/` folder)
3. Extract UI to sub-components (`components/` folder)
4. Main component becomes orchestrator only

---

## 🎯 SOLID Principles

### 1. Single Responsibility (SRP)
**Every component/function has ONE reason to change.**

**Test:** Can you describe it in 5 words or less?
- ✅ "Displays content card with hover"
- ❌ "Handles list data, UI, modals, pagination..." (too many)

```typescript
// ❌ BAD: Multiple responsibilities
export default function ListPage() {
  const { data } = useApi(...);              // Data fetching
  const handleDrag = () => {...};             // Drag-and-drop
  const [currentPage, setPage] = useState(1); // Pagination
  const groupedItems = useMemo(() => {...});  // Grouping
  return <div>{/* 2000 lines of JSX */}</div>;
}

// ✅ GOOD: Single responsibility
export default function ListPage({ listId }: Props) {
  const data = useListData(listId);        // Hook handles data
  const reordering = useListReordering();  // Hook handles drag
  const pagination = usePagination();      // Hook handles pagination
  const grouping = useGrouping();          // Hook handles grouping

  return (
    <>
      <ListHeader list={data.list} />
      <ListContent items={pagination.items} />
    </>
  );
}
```

### 2. Open/Closed (OCP)
**Open for extension, closed for modification.**

```typescript
// ❌ BAD: Modification required for new types
function ContentCard({ content }: Props) {
  if (content.type === 'MOVIE') return <MovieCard />;
  if (content.type === 'TV_SHOW') return <TVCard />;
  // Adding new type = modify this file
}

// ✅ GOOD: Extensible via configuration
const RENDERERS: Record<ContentType, ComponentType> = {
  MOVIE: MovieCard,
  TV_SHOW: TVCard,
  GAME: GameCard, // Just add to map
};

function ContentCard({ content }: Props) {
  const Renderer = RENDERERS[content.type];
  return <Renderer content={content} />;
}
```

### 3. Liskov Substitution (LSP)
**Subtypes must be substitutable for base types.**

```typescript
// ✅ All cards implement same interface
interface CardProps {
  title: string;
  image: string;
  onClick: () => void;
}

export function MovieCard(props: CardProps) { /* ... */ }
export function TVCard(props: CardProps) { /* ... */ }
// All interchangeable
```

### 4. Interface Segregation (ISP)
**Don't force components to depend on unused props.**

```typescript
// ❌ BAD: Fat interface
interface Props {
  item: ListItem;
  onEdit?: () => void;
  onDelete?: () => void;
  onRate?: () => void;
  // 20+ optional props...
}

// ✅ GOOD: Segregated interfaces
interface CoreProps { item: ListItem; }
interface ActionsProps { onEdit: () => void; onDelete: () => void; }

function ListItem({ item, actions }: { item: ListItem; actions?: ActionsProps }) {
  // Only uses what it needs
}
```

### 5. Dependency Inversion (DIP)
**Depend on abstractions, not concrete implementations.**

```typescript
// ❌ BAD: Direct store dependency
function MyComponent() {
  const user = useAuthStore((state) => state.user);
}

// ✅ GOOD: Abstract via custom hook
function MyComponent() {
  const { user } = useAuth(); // Can change implementation
}
```

---

## 🚫 DRY Principle (ZERO TOLERANCE)

**Absolute Rule:** If code appears MORE THAN ONCE, extract it IMMEDIATELY.

### Extraction Hierarchy
1. **Duplicated logic** → `lib/utils/`
2. **Duplicated UI** → `app/_components/common/`
3. **Duplicated hook logic** → `app/_hooks/`
4. **Duplicated constants** → Config file

### Project-Specific Extractions

**Already Extracted (✅ GOOD):**
- `buildContentUrl()` → `lib/utils/navigationUtils.ts`
- `getSourceApi()` → `lib/utils/contentTypeUtils.ts`
- `<StatusBadge />` → `app/_components/common/StatusBadge.tsx`

---

## 📁 File Organization

### Rule #1: No Single-File Folders
```
❌ BAD: app/_components/cards/ContentCard/index.tsx (only file)
✅ GOOD: app/_components/cards/ContentCard.tsx
```

**Folders required ONLY when:**
- Multiple related files (index.tsx + hooks + components)
- Has sub-components
- Has test files

### Rule #2: Helper Functions at End
```typescript
// ✅ GOOD: Main export first, helpers at end
export function MainComponent() {
  return <div>{helperA()}</div>;
}

function helperA() { /* ... */ }
function helperB() { /* ... */ }
```

**File structure:**
1. Imports
2. Types/interfaces
3. Constants
4. Main export
5. Helper functions

### Rule #3: Avoid Single-Use Config Files
```typescript
// ❌ BAD: Separate config for single use
// File: HomePage/config.ts
export const CONFIG = { count: 6 };

// ✅ GOOD: Inline where used
// File: HomePage/index.tsx
const CONFIG = { count: 6 } as const;
```

**Config files appropriate when:**
- Used in 3+ files
- Environment-specific
- Feature flags
- API endpoints

### Rule #4: Named Exports (MANDATORY)
```typescript
// ❌ BAD: Default exports
export default function LoginForm() {}

// ✅ GOOD: Named exports
export function LoginForm() {}
```

**Why?**
- Better refactoring (IDE finds all usages)
- Explicit imports (no naming confusion)
- Better tree-shaking
- Easier to grep

**Only exception:** Next.js framework files (`page.tsx`, `layout.tsx`, `route.ts`)

---

## 💬 Commenting Policy

**Golden Rule: CODE MUST BE SELF-EXPLANATORY**

### FORBIDDEN Comments ❌
```typescript
// ❌ NO: Obvious comments
// Set the user state
const [user, setUser] = useState<User | null>(null);

// Fetch data from API
const data = await fetchContent(id);

// Check if user is logged in
if (user) {
  router.push('/dashboard');
}
```

### ALLOWED Comments ✅ (Rare)
```typescript
// ✅ OK: Explains WHY (complex business logic)
// TMDB API requires rate limiting: max 40 requests/10 seconds
await batchWithRateLimit(requests, { maxPerWindow: 40, windowMs: 10000 });

// ✅ OK: Non-obvious workaround
// Safari doesn't support IntersectionObserver with sticky elements
useEffect(() => {
  if (isSafari) window.addEventListener('scroll', handleStickyScroll);
}, []);

// ✅ OK: Security reasoning
// Input sanitization prevents XSS attacks
const sanitized = DOMPurify.sanitize(userInput);
```

### Eliminate Comments Via
1. **Extract to well-named functions**
2. **Use descriptive variable names**
3. **Extract complex conditions**
4. **Use TypeScript types as documentation**

---

## 🔒 TypeScript (STRICT MODE)

### FORBIDDEN ❌
- `any` type
- Type assertions (`as`)
- `@ts-ignore` / `@ts-expect-error`

### REQUIRED ✅
```typescript
// ✅ Explicit types
interface ClickData {
  id: string;
  type: ContentType;
}

function handleClick(data: ClickData): void {
  console.log(data.id);
}

// ✅ Type guards
function isUser(data: unknown): data is User {
  return typeof data === 'object' && data !== null && 'id' in data;
}

// ✅ Discriminated unions
type Content =
  | { type: 'MOVIE'; runtime: number }
  | { type: 'TV_SHOW'; seasons: number }
  | { type: 'GAME'; platforms: string[] };
```

---

## ⚛️ React Best Practices

### 1. Extract Logic to Custom Hooks
```typescript
// ✅ Complex logic in hook
export function useListReordering(listId: string) {
  const [draggedItem, setDraggedItem] = useState<ListItem | null>(null);

  const handleDragStart = useCallback((item: ListItem) => {
    setDraggedItem(item);
  }, []);

  const handleDragEnd = useCallback(async (targetIndex: number) => {
    if (!draggedItem) return;
    await reorderItems({ itemId: draggedItem.id, targetIndex });
    setDraggedItem(null);
  }, [draggedItem]);

  return { draggedItem, handleDragStart, handleDragEnd };
}
```

### 2. Memoization
```typescript
// ✅ Memoize expensive computations
const groupedItems = useMemo(() => groupItemsByStatus(items), [items]);

// ✅ Memoize callbacks
const handleClick = useCallback((id: string) => {
  router.push(`/items/${id}`);
}, [router]);
```

### 3. Composition over Props Drilling
```typescript
// ❌ BAD: Props drilling
<Parent user={user}>
  <Child1 user={user}>
    <Child2 user={user} />
  </Child1>
</Parent>

// ✅ GOOD: Context
const { user } = useAuth(); // Available anywhere
```

---

## 📦 Next.js App Router

### Server Components by Default
```typescript
// ✅ Server component (default)
export default async function ListPage({ params }: Props) {
  const list = await fetchList(params.id);
  return <ListDetailPage list={list} />;
}

// ✅ Client component (when needed)
'use client';
export default function ListDetailPage({ list }: Props) {
  const [items, setItems] = useState(list.items);
  return <div>...</div>;
}
```

### Loading & Error States
```typescript
// app/lists/[id]/loading.tsx
export default function Loading() {
  return <ListDetailSkeleton />;
}

// app/lists/[id]/error.tsx
'use client';
export default function Error({ error, reset }: Props) {
  return <ErrorBoundary error={error} reset={reset} />;
}
```

---

## ✅ Code Review Checklist

**Before completing ANY component:**

**Component Size:**
- [ ] Under 200 lines (MANDATORY)
- [ ] Single responsibility (5-word description)
- [ ] Logic in custom hooks
- [ ] Reusable UI in sub-components

**DRY:**
- [ ] No duplication from other files
- [ ] No duplication within file
- [ ] Utilities in `lib/utils/`
- [ ] Common components in `app/_components/common/`

**Type Safety:**
- [ ] No `any` types
- [ ] No type assertions
- [ ] Proper interfaces
- [ ] Discriminated unions

**Performance:**
- [ ] `useMemo` for expensive operations
- [ ] `useCallback` for callbacks
- [ ] No unnecessary re-renders
- [ ] Next.js Image optimization

**Accessibility:**
- [ ] Semantic HTML
- [ ] ARIA labels
- [ ] Keyboard navigation
- [ ] Focus management

**Comments:**
- [ ] No unnecessary comments
- [ ] Code is self-documenting
- [ ] Only complex logic commented (rare)

---

## 🎯 Refactoring Priorities

**Priority 1 - IMMEDIATE:**
- Components over 300 lines
- Code duplicated 3+ times
- Using `any` type

**Priority 2 - SOON:**
- Components 200-300 lines
- Code duplicated 2 times
- Logic not in hooks

**Priority 3 - WHEN TOUCHING:**
- Components 150-200 lines
- Minor DRY violations
- Optimization opportunities

---

## 📖 The Ten Commandments

1. **NEVER** create components over 200 lines
2. **NEVER** repeat code more than once
3. **NEVER** use `any` type or type assertions
4. **NEVER** add unnecessary comments
5. **ALWAYS** extract logic to custom hooks
6. **ALWAYS** extract reusable UI to sub-components
7. **ALWAYS** follow Single Responsibility Principle
8. **ALWAYS** check for existing utilities first
9. **ALWAYS** use composition over inheritance
10. **ALWAYS** write self-documenting code

**Philosophy:** Clean code is about clarity and maintainability, not cleverness.

---

## ⭐ Reference Implementation: ListDetailPage

**Gold Standard** for component refactoring in this project.

**Before:** 2,114 lines (CRITICAL violation)
**After:** 391 lines (-81.5% reduction)

**Architecture:**
- 8 custom hooks (~685 lines) - All business logic
- 9 sub-components (~1,200 lines) - All UI
- 391-line orchestrator - Pure composition

**Result:**
- ✅ 100% testable (logic in isolated hooks)
- ✅ Zero duplication
- ✅ Complete SOLID compliance
- ✅ All components under 350 lines

**Apply this pattern to ALL components over 200 lines.**

---

## 📂 Recommended Structure

```
app/_components/pages/FeaturePage/
├── index.tsx                 # Orchestrator (~120 lines)
├── hooks/
│   ├── useFeatureData.ts    # Data fetching (~50 lines)
│   ├── useFeatureActions.ts # CRUD operations (~70 lines)
│   └── useFeatureState.ts   # State management (~60 lines)
├── components/
│   ├── FeatureHeader.tsx    # (~80 lines)
│   ├── FeatureContent.tsx   # (~120 lines)
│   └── FeatureSidebar.tsx   # (~90 lines)
└── utils.ts                  # Pure functions only
```

---

**Remember:** Your future self will thank you for writing clean code today.
