# AI Agent Guidelines for Cursor

This document provides comprehensive guidelines for AI assistants (specifically Cursor) working with this Next.js codebase. These guidelines are **MANDATORY** and override any default behaviors.

> **📘 Code Quality Standards:** All code must follow the standards in **[CODING_STANDARDS.md](./CODING_STANDARDS.md)**. This includes SOLID principles, DRY enforcement, component size limits (<200 lines), and TypeScript strict mode.

---

## Project Context

**Framework**: Next.js 16.0.0 with App Router
**Language**: TypeScript (Strict Mode)
**Styling**: Tailwind CSS v4
**State**: Zustand with persistence
**Backend**: Django REST API (JWT auth)

---

## Quick Start Commands

```bash
npm install          # Install dependencies
npm run dev          # Development server (localhost:3000)
npm run build        # Production build
npm run start        # Run production build
npm run lint         # Run ESLint
```

---

## Critical Rules (From CODING_STANDARDS.md)

### 1. Component Size Limits (MANDATORY)
- ✅ **Maximum: 200 lines** (HARD LIMIT)
- ✅ **Recommended: 150 lines**
- ❌ **FORBIDDEN: 300+ lines**

**When approaching 200 lines:**
1. STOP immediately
2. Extract logic to custom hooks
3. Extract UI to sub-components
4. Main component becomes orchestrator

### 2. SOLID Principles
**Single Responsibility:** One reason to change
- Test: Can you describe it in 5 words?
- ✅ "Displays content card with hover"
- ❌ "Handles list data, UI, modals, pagination..."

**Other SOLID Principles:**
- Open/Closed: Extensible via composition
- Liskov Substitution: Interchangeable subtypes
- Interface Segregation: No unused props
- Dependency Inversion: Depend on abstractions

### 3. DRY Principle (Zero Tolerance)
**If code appears MORE THAN ONCE, extract it IMMEDIATELY.**

**Extraction hierarchy:**
1. Duplicated logic → `lib/utils/`
2. Duplicated UI → `app/_components/common/`
3. Duplicated hook logic → `app/_hooks/`
4. Duplicated constants → Config file

### 4. File Organization
**No single-file folders:**
```
❌ app/_components/cards/ContentCard/index.tsx (only file)
✅ app/_components/cards/ContentCard.tsx
```

**Helper functions at end:**
```typescript
export function MainComponent() { /* ... */ }
// Helpers after main export
function helperA() { /* ... */ }
function helperB() { /* ... */ }
```

**Named exports (not default):**
```typescript
❌ export default function LoginForm() {}
✅ export function LoginForm() {}
```
**Exception:** Next.js framework files (`page.tsx`, `layout.tsx`, `route.ts`)

### 5. TypeScript Strict Mode
**FORBIDDEN:**
- `any` type
- Type assertions (`as`)
- `@ts-ignore` / `@ts-expect-error`

**REQUIRED:**
- Explicit types for all parameters
- Type guards instead of assertions
- Discriminated unions for variants

### 6. Minimal Commenting Policy
**Golden Rule: CODE MUST BE SELF-EXPLANATORY**

**FORBIDDEN comments:**
```typescript
❌ // Set the user state
❌ // Fetch data from API
❌ // Check if user is logged in
```

**ALLOWED comments (rare):**
- Complex business logic (explains WHY)
- Non-obvious workarounds
- Performance optimizations
- Security considerations

**Eliminate comments via:**
1. Extract to well-named functions
2. Use descriptive variable names
3. Extract complex conditions
4. Use TypeScript types as documentation

---

## Component Architecture Pattern

```
app/_components/pages/FeaturePage/
├── index.tsx                 # Orchestrator (~120 lines)
├── hooks/                    # Business logic
│   ├── useFeatureData.ts    # Data fetching (~50)
│   ├── useFeatureActions.ts # CRUD operations (~70)
│   └── useFeatureState.ts   # State management (~60)
├── components/               # UI sub-components
│   ├── FeatureHeader.tsx    # (~80)
│   ├── FeatureContent.tsx   # (~120)
│   └── FeatureSidebar.tsx   # (~90)
└── utils.ts                  # Pure functions
```

---

## React & Next.js Best Practices

### Extract Logic to Custom Hooks
```typescript
// ✅ GOOD: Complex logic in hook
export function useListReordering(listId: string) {
  const [draggedItem, setDraggedItem] = useState<ListItem | null>(null);

  const handleDragStart = useCallback((item: ListItem) => {
    setDraggedItem(item);
  }, []);

  return { draggedItem, handleDragStart, handleDragEnd };
}
```

### Memoization
```typescript
// ✅ Expensive computations
const groupedItems = useMemo(() => groupItemsByStatus(items), [items]);

// ✅ Callbacks
const handleClick = useCallback((id: string) => {
  router.push(`/items/${id}`);
}, [router]);
```

### Server vs Client Components
```typescript
// ✅ Server component (default)
export default async function Page({ params }: Props) {
  const data = await fetchData(params.id);
  return <DetailPage data={data} />;
}

// ✅ Client component (when needed)
'use client';
export default function DetailPage({ data }: Props) {
  const [state, setState] = useState(data);
  return <div>...</div>;
}
```

---

## Cursor-Specific Instructions

### When Writing Code
1. **Start Small**: Components should start at ~100 lines
2. **Refactor Early**: If approaching 150 lines, immediately split
3. **Think Composition**: Before adding logic, consider extracting
4. **Name Clearly**: Spend time on naming to eliminate comments
5. **Type Strictly**: Never compromise on type safety

### When Refactoring
1. **Test First**: Understand what the code does
2. **Split Incrementally**: Extract one piece at a time
3. **Keep Working**: Ensure code works after each extraction
4. **Update Imports**: Fix all import paths immediately
5. **Verify Types**: Ensure types flow correctly

### When Adding Features
1. **Check Size First**: If component >150 lines, refactor before adding
2. **Extract Logic**: New feature logic goes in custom hook first
3. **Reuse Components**: Use existing from `common/` folder
4. **Follow Patterns**: Match existing architecture

---

## Common Pitfalls to Avoid

### ❌ Don't Do This
1. Adding "just one more feature" to a 180-line component
2. Copy-pasting code because "it's only used twice"
3. Using `any` because "types are too complex"
4. Adding comments instead of improving names
5. Mixing business logic with UI rendering
6. Accepting tech debt "to ship faster"

### ✅ Do This Instead
1. Refactor before adding features
2. Extract to utility even for 2 uses
3. Define proper types or use type guards
4. Rename variables/functions for clarity
5. Extract logic to custom hooks
6. Ship clean code that won't slow you down later

---

## Code Review Checklist

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

**Comments:**
- [ ] No unnecessary comments
- [ ] Code is self-documenting
- [ ] Only complex logic commented (rare)

---

## Refactoring Priority

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

## Reference Implementation: ListDetailPage

**Gold Standard** for component refactoring:

**Before:** 2,114 lines (CRITICAL violation)
**After:** 391 lines (-81.5% reduction)

**Architecture:**
- 8 custom hooks (~685 lines) - All business logic
- 9 sub-components (~1,200 lines) - All UI
- 391-line orchestrator - Pure composition

**Result:**
- ✅ 100% testable
- ✅ Zero duplication
- ✅ Complete SOLID compliance
- ✅ All components under 350 lines

See [CODING_STANDARDS.md](./CODING_STANDARDS.md) for complete implementation details.

---

## Philosophy

**Clean code is not about being clever. It's about being clear.**

- Clear naming eliminates comments
- Small components are easier to understand
- Extracted logic is easier to test
- Shared utilities prevent bugs
- Type safety catches errors at compile time

**Your future self will thank you for writing clean code today.**

---

## Questions?

If you're unsure about:
- **Component size:** Split it
- **Code duplication:** Extract it
- **Unclear name:** Rename it
- **Need for comment:** Refactor it
- **Type complexity:** Define proper types

**When in doubt, choose the cleaner, more maintainable approach.**

---

**For complete details, always refer to [CODING_STANDARDS.md](./CODING_STANDARDS.md)**
