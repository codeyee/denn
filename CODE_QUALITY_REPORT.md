# Code Quality Assessment & Migration Plan
**Project**: denn-web (Next.js Media Aggregator)
**Generated**: 2025-11-14
**Guidelines**: CLAUDE.md, GEMINI.md, AGENTS.md

---

## Executive Summary

### Overall Assessment: 🔴 CRITICAL - IMMEDIATE ACTION REQUIRED

The codebase demonstrates **good architectural decisions** but **severe execution problems**. Multiple components violate fundamental clean code principles, with the worst offender (`ListDetailPage`) exceeding guidelines by **10.6x** (2,114 lines vs 200 max).

### Key Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **Max Component Size** | 200 lines | 2,114 lines | 🔴 CRITICAL |
| **Components Over Limit** | 0 | 16 | 🔴 CRITICAL |
| **Code Duplication** | None | High | 🔴 HIGH |
| **Type Safety** | 100% | ~95% | 🟡 MEDIUM |
| **Comment Density** | Minimal | Low | ✅ GOOD |

### Risk Level

- **Maintainability**: 🔴 **CRITICAL** - Components too large to safely modify
- **Testability**: 🔴 **CRITICAL** - Logic not extracted, impossible to test
- **Bug Risk**: 🔴 **HIGH** - Complex nested logic prone to errors
- **Scalability**: 🟡 **MEDIUM** - Will worsen as features grow
- **Developer Experience**: 🔴 **POOR** - Hard to navigate and understand

---

## Detailed Findings

### 1. Component Size Violations (CRITICAL)

#### 🚨 URGENT - Immediate Refactoring Required

| File | Lines | Over Limit | Priority | Estimated Effort |
|------|-------|------------|----------|------------------|
| **ListDetailPage/index.tsx** | **2,114** | **+1,914** | 🔴 URGENT | 3-4 days |
| **DomeGallery.tsx** | 934 | +734 | 🔴 URGENT | 2-3 days |
| **ContentDetailPage/index.tsx** | 802 | +602 | 🔴 URGENT | 2-3 days |
| **AddToListModal.tsx** | 589 | +389 | 🔴 HIGH | 1-2 days |
| **SearchPage/index.tsx** | 502 | +302 | 🔴 HIGH | 1-2 days |
| **ContentCard/index.tsx** | 379 | +179 | 🔴 HIGH | 1 day |
| **HomePage/index.tsx** | 350 | +150 | 🔴 HIGH | 1 day |
| **ListControls.tsx** | 341 | +141 | 🔴 HIGH | 1 day |
| **ListItemCard/index.tsx** | 321 | +121 | 🔴 HIGH | 1 day |
| **Card/index.tsx** | 317 | +117 | 🔴 HIGH | 1 day |
| **FeaturedBanner.tsx** | 266 | +66 | 🟡 MEDIUM | 0.5 day |

**Total Components Over 200 Lines**: 16
**Total Components Over 300 Lines**: 11
**Total Technical Debt**: ~15-20 developer days

---

### 2. SOLID Principle Violations

#### Single Responsibility Principle (SRP) - CRITICAL

**ListDetailPage/index.tsx** (2,114 lines) violates SRP with **9+ responsibilities**:

1. ❌ Data fetching and caching (lines 197-216)
2. ❌ Drag-and-drop reordering (lines 132-407)
3. ❌ CRUD operations (lines 243-337)
4. ❌ Pagination management (3 levels: global, group, subgroup)
5. ❌ Grouping and sorting (lines 426-516)
6. ❌ View mode rendering (list vs gallery)
7. ❌ Modal state management (lines 96-102)
8. ❌ Statistics calculation (lines 613-618)
9. ❌ User preferences persistence (lines 218-241)

**Required Refactoring**:

```
ListDetailPage/ (~150 lines total)
├── index.tsx                    # Orchestrator only (~120 lines)
├── hooks/
│   ├── useListData.ts          # Responsibility #1 (~50 lines)
│   ├── useListReordering.ts    # Responsibility #2 (~80 lines)
│   ├── useListPagination.ts    # Responsibility #4 (~60 lines)
│   ├── useListGrouping.ts      # Responsibility #5 (~70 lines)
│   ├── useListItemActions.ts   # Responsibility #3 (~80 lines)
│   ├── useListModals.ts        # Responsibility #7 (~40 lines)
│   └── useListPreferences.ts   # Responsibility #9 (~50 lines)
└── components/
    ├── ListHeader.tsx          # Stats display (~80 lines)
    ├── ListView/
    │   ├── FlatListView.tsx    # (~100 lines)
    │   └── GroupedListView.tsx # (~120 lines)
    └── GalleryView/
        ├── FlatGalleryView.tsx # (~100 lines)
        └── GroupedGalleryView.tsx # (~120 lines)
```

---

#### Open/Closed Principle (OCP) - MEDIUM

**Violations Found**:
- ContentDetailPage uses if/else chains for content types (lines 250-350)
- Should use configuration map pattern

**Solution**:
```typescript
const CONTENT_DETAIL_RENDERERS: Record<ContentType, ComponentType> = {
  MOVIE: MovieDetailContent,
  TV_SHOW: TVShowDetailContent,
  GAME: GameDetailContent,
  MUSIC: AlbumDetailContent,
  BOOK: BookDetailContent,
};
```

---

#### Interface Segregation Principle (ISP) - LOW

Most components properly segregate interfaces. Minor improvements needed in:
- ListItemCard props (could split interactive vs display props)

---

#### Liskov Substitution Principle (LSP) - GOOD ✅

Card components properly implement consistent interfaces.

---

#### Dependency Inversion Principle (DIP) - GOOD ✅

Proper use of custom hooks (`useAuth`, `useApi`) to abstract store dependencies.

---

### 3. DRY Principle Violations

#### ✅ Already Properly Extracted (GOOD)

1. **Navigation Utils** (`lib/utils/navigationUtils.ts`)
   - `buildContentUrl()`
   - `navigateToContent()`

2. **Content Type Utils** (`lib/utils/contentTypeUtils.ts`)
   - `getSourceApi()`
   - `getContentType()`
   - `CONTENT_TYPE_CONFIG` map

3. **StatusBadge Component** (`app/_components/common/StatusBadge.tsx`)
   - Well-implemented with variants
   - **Problem**: Not being used in ListDetailPage (still has inline badges)

---

#### ❌ Still Duplicated - MUST FIX

##### 1. Status Badge Rendering (4 occurrences in ListDetailPage)

**Files**: ListDetailPage/index.tsx (lines 1032-1042, 1184-1195, 1282-1293, 1528-1539)

**Pattern**:
```typescript
<div className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
  item.status === ItemStatus.COMPLETED
    ? "bg-green-500/20 text-green-400 border border-green-500/30"
    : "bg-white/10 text-white/80 border border-white/20"
}`}>
  {item.status === ItemStatus.COMPLETED ? "COMPLETED" : "PENDING"}
</div>
```

**Solution**: Replace all with existing `<StatusBadge status={item.status} />`

**Impact**: Removes ~60 lines of duplicated code

---

##### 2. Modifier Key Click Handling (2 files)

**Files**:
- ContentCard/index.tsx (line 59)
- ListItemCard/index.tsx (line 69)

**Pattern**:
```typescript
const isModifierClick = e.ctrlKey || e.metaKey;
if (isModifierClick) {
  const newWindow = window.open(url, "_blank");
  if (newWindow) {
    newWindow.blur();
    window.focus();
  }
}
```

**Solution**: Create `app/_hooks/useSmartNavigation.ts`

```typescript
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

**Impact**: Eliminates duplicate navigation logic, makes it testable

---

##### 3. Pagination Controls (3 occurrences in ListDetailPage)

**Files**: ListDetailPage/index.tsx
- Lines 652-716 (global pagination)
- Lines 773-844 (group pagination)
- Lines 864-903 (subgroup pagination)

**Pattern**:
```typescript
<button onClick={() => setPage(1)} disabled={currentPage === 1}>
  <ChevronsLeft className="w-3 h-3" />
</button>
<button onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1}>
  <ChevronLeft className="w-3 h-3" />
</button>
<span className="text-sm text-white/70">
  Page {currentPage} of {totalPages}
</span>
<button onClick={() => setPage(currentPage + 1)} disabled={currentPage === totalPages}>
  <ChevronRight className="w-3 h-3" />
</button>
<button onClick={() => setPage(totalPages)} disabled={currentPage === totalPages}>
  <ChevronsRight className="w-3 h-3" />
</button>
```

**Solution**: Create `app/_components/common/PaginationControls.tsx`

```typescript
interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationControlsProps) {
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(1)}
        disabled={isFirstPage}
        aria-label="First page"
      >
        <ChevronsLeft className="w-3 h-3" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={isFirstPage}
        aria-label="Previous page"
      >
        <ChevronLeft className="w-3 h-3" />
      </Button>
      <span className="text-sm text-white/70 min-w-[80px] text-center">
        Page {currentPage} of {totalPages}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={isLastPage}
        aria-label="Next page"
      >
        <ChevronRight className="w-3 h-3" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(totalPages)}
        disabled={isLastPage}
        aria-label="Last page"
      >
        <ChevronsRight className="w-3 h-3" />
      </Button>
    </div>
  );
}
```

**Impact**: Removes ~150 lines of duplicated pagination code, improves accessibility

---

##### 4. Loading Carousel Pattern (5+ occurrences)

**Files**: HomePage, SearchPage, ContentDetailPage

**Pattern**:
```typescript
<Carousel title="Popular Movies" items={[]} isLoading>
  {Array.from({ length: 6 }).map((_, index) => (
    <PlaceholderCard key={`placeholder-${index}`} index={index} />
  ))}
</Carousel>
```

**Solution**: Create `app/_components/common/LoadingCarousel.tsx`

```typescript
interface LoadingCarouselProps {
  title: string;
  count?: number;
}

export function LoadingCarousel({ title, count = 6 }: LoadingCarouselProps) {
  return (
    <Carousel title={title} items={[]} isLoading>
      {Array.from({ length: count }).map((_, index) => (
        <PlaceholderCard key={`${title}-placeholder-${index}`} index={index} />
      ))}
    </Carousel>
  );
}
```

**Impact**: Simplifies loading states across the app

---

### 4. TypeScript Type Safety Issues

#### Type Assertions (`as any`) - 24 Occurrences

| File | Count | Lines | Severity |
|------|-------|-------|----------|
| DomeGallery.tsx | 14 | Various | 🔴 HIGH |
| HomePage/index.tsx | 4 | 92-94 | 🔴 HIGH |
| ContentDetailPage/index.tsx | 1 | TBD | 🟡 MEDIUM |
| ListItemCard/index.tsx | 1 | TBD | 🟡 MEDIUM |
| FeaturedBanner.tsx | 1 | TBD | 🟡 MEDIUM |
| Carousel/index.tsx | 1 | TBD | 🟡 MEDIUM |
| Others | 2 | TBD | 🟡 MEDIUM |

**Example Violation**:
```typescript
// ❌ BAD: HomePage/index.tsx (lines 92-94)
{typeof (suggestionsError as any).message === "string"
  ? (suggestionsError as any).message
  : "Unknown error"}
```

**Solution**: Define proper error types

```typescript
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
    typeof (error as any).message === 'string'
  );
}

// Usage
const errorMessage = isApiError(suggestionsError)
  ? suggestionsError.message
  : 'Unknown error';
```

**Impact**: Improved type safety, better autocomplete, fewer runtime errors

---

#### Missing Type Imports

**Issue**: `MemberRating` type used without import in ListDetailPage

**Files**: ListDetailPage/index.tsx (lines 321, 379, 416, 983, 1137, 1379)

**Pattern**:
```typescript
item.member_ratings.some((rating: MemberRating) => ...)
```

**Solution**: Add proper import
```typescript
import type { ListItem, MemberRating } from '@/types';
```

---

### 5. Comment Density Analysis

#### ✅ GOOD - Minimal Commenting

Overall comment density is **low and appropriate**. Most code is self-documenting.

**Examples of Good Commenting**:
1. `StatusBadge.tsx` - JSDoc for public API (appropriate)
2. Complex algorithms have brief explanations (appropriate)

**Examples to Improve**:
1. Remove obvious comments like "Set state" or "Call API"
2. Some inline status checks could use better variable names instead of comments

**Overall Grade**: ✅ **GOOD** - No major issues

---

### 6. Hook Extraction Opportunities

#### Critical Missing Hooks

##### ListDetailPage Required Hooks (8 total):

1. **useListData.ts** (~50 lines)
   - Current: Lines 197-216 in index.tsx
   - Responsibility: Data fetching from API

2. **useListReordering.ts** (~80 lines)
   - Current: Lines 132-407 in index.tsx
   - Responsibility: Drag-and-drop logic

3. **useListPagination.ts** (~60 lines)
   - Current: Lines 120-129 in index.tsx
   - Responsibility: Three-level pagination state

4. **useListGrouping.ts** (~70 lines)
   - Current: Lines 426-516 in index.tsx
   - Responsibility: Grouping and sorting logic

5. **useListItemActions.ts** (~80 lines)
   - Current: Lines 243-337 in index.tsx
   - Responsibility: CRUD operations (edit, delete, rate)

6. **useListModals.ts** (~40 lines)
   - Current: Lines 96-102 in index.tsx
   - Responsibility: Modal state management

7. **useListPreferences.ts** (~50 lines)
   - Current: Lines 218-241 in index.tsx
   - Responsibility: User preferences (view mode, sorting, grouping)

8. **useListStats.ts** (~30 lines)
   - Current: Lines 613-618 in index.tsx
   - Responsibility: Statistics calculation

---

##### ContentDetailPage Required Hooks (3 total):

1. **useContentData.ts** (~80 lines)
   - Current: Lines 60-157
   - Responsibility: Content fetching and caching

2. **useUserRating.ts** (~50 lines)
   - Current: Lines 159-203
   - Responsibility: User rating state and updates

3. **useRatingModal.ts** (~40 lines)
   - Current: Lines 521-602
   - Responsibility: Rating modal state

---

##### SearchPage Required Hooks (2 total):

1. **useSearchDebounce.ts** (~40 lines)
   - Current: Lines 44-98
   - Responsibility: Debounced search logic

2. **useSearchResults.ts** (~60 lines)
   - Current: Mixed throughout component
   - Responsibility: Multi-source search results

---

### 7. Performance Opportunities

#### Missing Memoization

**Components that need `useMemo`**:
1. ListDetailPage - grouping/sorting computations (lines 426-516)
2. ContentDetailPage - filtered seasons list
3. SearchPage - filtered results

**Components that need `useCallback`**:
1. All event handlers passed as props
2. Navigation functions

**Example Fix**:
```typescript
// ❌ Current
const sortedItems = items.sort(...);
const handleClick = (id: string) => router.push(`/items/${id}`);

// ✅ Fixed
const sortedItems = useMemo(() => {
  return [...items].sort(...);
}, [items, sortBy, sortOrder]);

const handleClick = useCallback((id: string) => {
  router.push(`/items/${id}`);
}, [router]);
```

---

### 8. Component Architecture Issues

#### Missing Sub-Components

**ListDetailPage needs**:
1. `ListHeader.tsx` - Title, actions, stats (~80 lines)
2. `ViewModeToggle.tsx` - List/Gallery toggle (~40 lines)
3. `ListView/FlatListView.tsx` - Flat list rendering (~100 lines)
4. `ListView/GroupedListView.tsx` - Grouped list rendering (~120 lines)
5. `GalleryView/FlatGalleryView.tsx` - Flat gallery (~100 lines)
6. `GalleryView/GroupedGalleryView.tsx` - Grouped gallery (~120 lines)
7. `GroupHeader.tsx` - Group header with stats (~70 lines)

**ContentDetailPage needs**:
1. `ContentHeader.tsx` - Title, image, basic info (~100 lines)
2. `RatingsSection.tsx` - User + member ratings (already exists ✅)
3. `ContentAbout.tsx` - Description, genres, metadata (~80 lines)
4. `TracksSection.tsx` - Music tracks list (~60 lines)
5. `SeasonsSection.tsx` - TV show seasons (~80 lines)
6. `GallerySection.tsx` - Image gallery (~60 lines)

---

## Compliance with Guidelines

### CLAUDE.md Compliance

| Requirement | Status | Grade |
|-------------|--------|-------|
| Max 200 lines per component | ❌ Failed | 🔴 F |
| Single Responsibility | ❌ Failed | 🔴 F |
| DRY - No duplication | 🟡 Partial | 🟡 C |
| SOLID principles | 🟡 Partial | 🟡 C |
| TypeScript strict mode | 🟡 Partial | 🟡 B |
| Proper file organization | ✅ Good | ✅ B |
| Custom hooks for logic | ❌ Failed | 🔴 F |

**Overall Grade**: 🔴 **D-** (Critical violations in core components)

---

### GEMINI.md Compliance

| Requirement | Status | Grade |
|-------------|--------|-------|
| Component size limits | ❌ Failed | 🔴 F |
| DRY principle | 🟡 Partial | 🟡 C |
| Type safety | 🟡 Partial | 🟡 B |
| Code organization | ✅ Good | ✅ B |
| React best practices | 🟡 Partial | 🟡 C |

**Overall Grade**: 🔴 **D** (Similar critical violations)

---

### AGENTS.md Compliance (New)

| Requirement | Status | Grade |
|-------------|--------|-------|
| Minimal commenting | ✅ Good | ✅ A |
| Self-documenting code | ✅ Good | ✅ A |
| No unnecessary comments | ✅ Good | ✅ A |

**Overall Grade**: ✅ **A** (Comments are well-managed)

---

## Migration Plan

### Overview

**Total Estimated Effort**: 4-6 weeks (1 developer)
**Recommended Approach**: Incremental refactoring with continuous testing
**Risk Level**: Medium (proper testing required)

---

### Phase 1: Foundation (Week 1) - CRITICAL

**Goal**: Create reusable utilities and components to support later refactoring

#### Tasks:

1. **Create Missing Common Components** (2 days)
   - [ ] `app/_components/common/PaginationControls.tsx`
   - [ ] `app/_components/common/LoadingCarousel.tsx`
   - [ ] `app/_components/common/ErrorDisplay.tsx`
   - [ ] Test each component in isolation

2. **Create Missing Hooks** (2 days)
   - [ ] `app/_hooks/useSmartNavigation.ts`
   - [ ] `app/_hooks/useContentNavigation.ts`
   - [ ] `app/_hooks/usePagination.ts` (generic pagination)
   - [ ] Test each hook

3. **Fix Type Safety Issues** (1 day)
   - [ ] Create `lib/utils/typeGuards.ts` with type guard functions
   - [ ] Replace all `as any` with proper type guards
   - [ ] Add missing type imports

**Deliverables**:
- 3 new common components
- 3 new utility hooks
- Type safety improved to 100%
- All existing functionality still works

**Success Criteria**:
- ✅ No `as any` in codebase
- ✅ Reusable components tested and working
- ✅ Hooks tested and working

---

### Phase 2: ListDetailPage Refactoring (Week 2-3) - URGENT

**Goal**: Reduce ListDetailPage from 2,114 lines to ~150 lines

#### Step 1: Extract Custom Hooks (3 days)

**Order of extraction** (dependencies matter):

1. **Day 1**: Extract data and state hooks
   - [ ] Create `hooks/useListData.ts` (lines 197-216)
   - [ ] Create `hooks/useListModals.ts` (lines 96-102)
   - [ ] Create `hooks/useListPreferences.ts` (lines 218-241)
   - [ ] Test each hook independently

2. **Day 2**: Extract business logic hooks
   - [ ] Create `hooks/useListItemActions.ts` (lines 243-337)
   - [ ] Create `hooks/useListReordering.ts` (lines 132-407)
   - [ ] Create `hooks/useListStats.ts` (lines 613-618)
   - [ ] Test CRUD operations still work

3. **Day 3**: Extract view logic hooks
   - [ ] Create `hooks/useListPagination.ts` (lines 120-129, 652-903)
   - [ ] Create `hooks/useListGrouping.ts` (lines 426-516)
   - [ ] Test pagination and grouping

**After Day 3**: Main component should be ~800 lines

---

#### Step 2: Extract UI Components (4 days)

4. **Day 4**: Extract header section
   - [ ] Create `components/ListHeader.tsx` (~80 lines)
   - [ ] Create `components/ViewModeToggle.tsx` (~40 lines)
   - [ ] Test header rendering and interactions

5. **Day 5-6**: Extract list view components
   - [ ] Create `components/ListView/FlatListView.tsx` (~100 lines)
   - [ ] Create `components/ListView/GroupedListView.tsx` (~120 lines)
   - [ ] Create `components/ListView/GroupHeader.tsx` (~70 lines)
   - [ ] Test list view with real data

6. **Day 7**: Extract gallery view components
   - [ ] Create `components/GalleryView/FlatGalleryView.tsx` (~100 lines)
   - [ ] Create `components/GalleryView/GroupedGalleryView.tsx` (~120 lines)
   - [ ] Test gallery view with real data

**After Day 7**: Main component should be ~150-200 lines

---

#### Step 3: Replace Duplicated Code (1 day)

7. **Day 8**: Clean up duplications
   - [ ] Replace inline status badges with `<StatusBadge />`
   - [ ] Replace pagination controls with `<PaginationControls />`
   - [ ] Use `useSmartNavigation` hook
   - [ ] Final testing of all features

**Final Structure**:
```
app/_components/pages/ListDetailPage/
├── index.tsx                       # ~120 lines (orchestrator)
├── hooks/
│   ├── useListData.ts             # ~50 lines
│   ├── useListReordering.ts       # ~80 lines
│   ├── useListPagination.ts       # ~60 lines
│   ├── useListGrouping.ts         # ~70 lines
│   ├── useListItemActions.ts      # ~80 lines
│   ├── useListModals.ts           # ~40 lines
│   ├── useListPreferences.ts      # ~50 lines
│   └── useListStats.ts            # ~30 lines
├── components/
│   ├── ListHeader.tsx             # ~80 lines
│   ├── ViewModeToggle.tsx         # ~40 lines
│   ├── GroupHeader.tsx            # ~70 lines
│   ├── ListView/
│   │   ├── index.tsx              # ~30 lines (exports)
│   │   ├── FlatListView.tsx       # ~100 lines
│   │   └── GroupedListView.tsx    # ~120 lines
│   └── GalleryView/
│       ├── index.tsx              # ~30 lines (exports)
│       ├── FlatGalleryView.tsx    # ~100 lines
│       └── GroupedGalleryView.tsx # ~120 lines
└── utils.ts                       # Keep existing pure functions
```

**Testing Checklist**:
- [ ] All view modes work (flat list, grouped list, flat gallery, grouped gallery)
- [ ] Pagination works at all levels (global, group, subgroup)
- [ ] Drag-and-drop reordering works
- [ ] CRUD operations work (add, edit, delete, rate)
- [ ] Grouping and sorting work
- [ ] Preferences are persisted
- [ ] Modals open and function correctly
- [ ] Statistics are accurate

---

### Phase 3: ContentDetailPage & Modals (Week 4) - HIGH PRIORITY

**Goal**: Refactor remaining critical components

#### ContentDetailPage (802 → ~120 lines) - 3 days

1. **Day 9**: Extract hooks
   - [ ] Create `hooks/useContentData.ts` (~80 lines)
   - [ ] Create `hooks/useUserRating.ts` (~50 lines)
   - [ ] Create `hooks/useRatingModal.ts` (~40 lines)
   - [ ] Test data fetching and rating updates

2. **Day 10**: Extract header and about sections
   - [ ] Create `components/ContentHeader.tsx` (~100 lines)
   - [ ] Create `components/ContentAbout.tsx` (~80 lines)
   - [ ] Test rendering with all content types

3. **Day 11**: Extract media-specific sections
   - [ ] Create `components/TracksSection.tsx` (~60 lines)
   - [ ] Create `components/SeasonsSection.tsx` (~80 lines)
   - [ ] Create `components/GallerySection.tsx` (~60 lines)
   - [ ] Test with movies, TV shows, music, books, games

**Final Structure**:
```
app/_components/pages/ContentDetailPage/
├── index.tsx                    # ~120 lines
├── hooks/
│   ├── useContentData.ts       # ~80 lines
│   ├── useUserRating.ts        # ~50 lines
│   └── useRatingModal.ts       # ~40 lines
├── components/
│   ├── ContentHeader.tsx       # ~100 lines
│   ├── ContentAbout.tsx        # ~80 lines
│   ├── RatingsSection.tsx      # (already exists ✅)
│   ├── TracksSection.tsx       # ~60 lines
│   ├── SeasonsSection.tsx      # ~80 lines
│   └── GallerySection.tsx      # ~60 lines
└── content-types/              # Keep existing type-specific components
    ├── MovieDetailContent.tsx
    ├── TVShowDetailContent.tsx
    ├── GameDetailContent.tsx
    ├── AlbumDetailContent.tsx
    └── BookDetailContent.tsx
```

---

#### AddToListModal (589 → ~150 lines) - 2 days

4. **Day 12**: Extract hooks and components
   - [ ] Create `hooks/useAddToList.ts` (~60 lines)
   - [ ] Create `hooks/useSeasonSelection.ts` (~50 lines)
   - [ ] Create `components/ListSelector.tsx` (~80 lines)
   - [ ] Create `components/SeasonSelector.tsx` (~100 lines)
   - [ ] Test adding to lists with all content types

---

### Phase 4: Search & Home Pages (Week 5) - MEDIUM PRIORITY

**Goal**: Refactor remaining page components

#### SearchPage (502 → ~120 lines) - 2 days

1. **Day 13**: Extract hooks and refactor
   - [ ] Create `hooks/useSearchDebounce.ts` (~40 lines)
   - [ ] Create `hooks/useSearchResults.ts` (~60 lines)
   - [ ] Create `components/SearchInput.tsx` (~60 lines)
   - [ ] Create `components/SearchResultsCarousel.tsx` (~80 lines)
   - [ ] Test search across all content types

---

#### HomePage (350 → ~150 lines) - 2 days

2. **Day 14**: Refactor HomePage
   - [ ] Create `hooks/useHomeData.ts` (~80 lines)
   - [ ] Create `components/ContentCarousels.tsx` (~120 lines)
   - [ ] Simplify main component to orchestrator
   - [ ] Test all carousels load correctly

---

#### FeaturedBanner & Other Cards (266-379 lines) - 1 day

3. **Day 15**: Refactor large cards
   - [ ] Refactor `FeaturedBanner.tsx` (266 → ~150 lines)
   - [ ] Refactor `ContentCard/index.tsx` (379 → ~150 lines)
   - [ ] Refactor `ListItemCard/index.tsx` (321 → ~150 lines)
   - [ ] Test all cards render correctly

---

### Phase 5: Complex Components (Week 6) - MEDIUM PRIORITY

**Goal**: Refactor DomeGallery and remaining components

#### DomeGallery (934 → ~200 lines) - 3 days

1. **Day 16-17**: Analyze and extract
   - [ ] Analyze DomeGallery architecture
   - [ ] Extract 3D rendering logic to hooks
   - [ ] Extract animation logic
   - [ ] Fix all type assertions (`as any`)

2. **Day 18**: Test and polish
   - [ ] Test 3D gallery functionality
   - [ ] Performance testing
   - [ ] Fix any rendering issues

---

#### Remaining Components Over 200 Lines - 2 days

3. **Day 19-20**: Polish remaining components
   - [ ] ListControls.tsx (341 → ~150 lines)
   - [ ] Card/index.tsx (317 → ~150 lines)
   - [ ] TypesSection.tsx (264 → ~150 lines)
   - [ ] Navbar/index.tsx (257 → ~150 lines)
   - [ ] Carousel/index.tsx (209 → ~150 lines)

---

### Phase 6: Testing & Documentation (Ongoing)

**Continuous activities throughout all phases**:

1. **Unit Testing**
   - [ ] Test all custom hooks
   - [ ] Test utility functions
   - [ ] Test type guards

2. **Integration Testing**
   - [ ] Test page components
   - [ ] Test user flows (create list, add items, rate, etc.)
   - [ ] Test edge cases

3. **Documentation**
   - [ ] Document all new hooks (JSDoc)
   - [ ] Update CLAUDE.md with new patterns
   - [ ] Create REFACTORING_LOG.md

---

## Refactoring Best Practices

### Before You Start

1. **Create Feature Branch**
   ```bash
   git checkout -b refactor/component-name
   ```

2. **Write Tests First** (if none exist)
   - Document current behavior
   - Create integration tests

3. **Take Snapshots**
   - Screenshot current UI
   - Note current functionality

---

### During Refactoring

1. **Work Incrementally**
   - Extract one piece at a time
   - Test after each extraction
   - Commit working changes frequently

2. **Keep it Running**
   - Application should work after each commit
   - Never break existing functionality
   - Use feature flags if needed

3. **Follow the Plan**
   - Extract hooks before components
   - Extract simple components before complex
   - Dependencies first, then dependents

---

### After Each Extraction

1. **Test Thoroughly**
   - [ ] Manual testing in browser
   - [ ] Run automated tests
   - [ ] Check all variations (view modes, edge cases)

2. **Code Review**
   - [ ] Component under 200 lines ✅
   - [ ] Single responsibility ✅
   - [ ] No code duplication ✅
   - [ ] Proper TypeScript types ✅
   - [ ] No unnecessary comments ✅

3. **Commit**
   ```bash
   git add .
   git commit -m "refactor(ListDetailPage): extract useListData hook"
   ```

---

## Success Metrics

### Target Metrics (End of Migration)

| Metric | Current | Target | Success Criteria |
|--------|---------|--------|------------------|
| **Max Component Size** | 2,114 | 200 | ✅ All under 200 lines |
| **Components Over 200** | 16 | 0 | ✅ Zero violations |
| **Code Duplication** | High | None | ✅ DRY score > 95% |
| **Type Safety** | ~95% | 100% | ✅ No `any` types |
| **Test Coverage** | Low | 70%+ | ✅ Critical paths tested |
| **Build Time** | Unknown | Stable | ✅ No performance regression |

---

### Quality Gates

**Phase 1 Gate**:
- ✅ All utility components created
- ✅ All utility hooks created
- ✅ Type safety at 100%
- ✅ All tests pass

**Phase 2 Gate** (Critical):
- ✅ ListDetailPage under 200 lines
- ✅ All features still work
- ✅ No performance regression
- ✅ All tests pass

**Phase 3 Gate**:
- ✅ ContentDetailPage under 200 lines
- ✅ AddToListModal under 200 lines
- ✅ All tests pass

**Phase 4 Gate**:
- ✅ SearchPage under 200 lines
- ✅ HomePage under 200 lines
- ✅ All tests pass

**Phase 5 Gate**:
- ✅ DomeGallery under 300 lines (complex 3D component)
- ✅ All remaining components under 200 lines
- ✅ All tests pass

**Final Gate**:
- ✅ Zero components over 200 lines
- ✅ Zero `any` types
- ✅ DRY violations eliminated
- ✅ Test coverage > 70%
- ✅ Documentation updated
- ✅ Code review approved

---

## Risk Mitigation

### High-Risk Areas

1. **ListDetailPage Refactoring**
   - **Risk**: Breaking complex pagination/grouping logic
   - **Mitigation**: Extensive testing, incremental extraction, keep utils.ts logic intact

2. **DomeGallery Refactoring**
   - **Risk**: Breaking 3D rendering or animations
   - **Mitigation**: Deep understanding before refactoring, performance testing

3. **Type Safety Fixes**
   - **Risk**: Introducing runtime errors from strict typing
   - **Mitigation**: Proper type guards, thorough testing

---

### Rollback Plan

**If refactoring fails**:
1. Revert to last working commit
2. Analyze what went wrong
3. Adjust approach
4. Try again with smaller increments

**Commit Strategy**:
```bash
# Good commit frequency
git commit -m "extract useListData hook"           # Working
git commit -m "extract useListReordering hook"     # Working
git commit -m "extract ListHeader component"       # Working

# Each commit = working state
# Easy to rollback to any point
```

---

## Monitoring & Verification

### During Refactoring

**Check after each extraction**:
```bash
# TypeScript compilation
npm run build

# Linting
npm run lint

# Type checking
npm run type-check

# Tests (when available)
npm run test
```

---

### After Completion

**Final Verification**:

1. **Line Count Check**
   ```bash
   # Count lines in all .tsx components
   find app/_components -name "*.tsx" -exec wc -l {} \; | sort -rn

   # Should see no files over 200 lines
   ```

2. **Type Safety Check**
   ```bash
   # Search for 'any' type usage
   rg ":\s*any" app/ lib/
   rg "as any" app/ lib/

   # Should return zero results
   ```

3. **Duplication Check**
   ```bash
   # Use jscpd or similar tool
   npx jscpd app/ lib/

   # Should show minimal duplication
   ```

4. **Build & Performance**
   ```bash
   npm run build

   # Check bundle size hasn't increased
   # Check build time is reasonable
   ```

---

## Appendix A: Detailed Component Breakdown

### ListDetailPage Current Structure (2,114 lines)

**State Management** (lines 60-131):
- useState hooks: 15 different pieces of state
- useRef hooks: 4 refs for scroll/drag tracking
- Store connections: auth, lists, UI, settings

**Data Fetching** (lines 197-216):
- List data fetching
- Member data fetching
- Error handling

**Effects** (lines 132-242):
- Drag-and-drop setup (lines 132-194)
- Data fetching effect (lines 197-216)
- Preferences loading (lines 218-241)

**CRUD Operations** (lines 243-407):
- Update list metadata (243-279)
- Delete list (281-308)
- Delete item (310-337)
- Rate item (339-374)
- Update item status (376-407)

**Grouping & Sorting Logic** (lines 409-618):
- Group by status (426-474)
- Group by rating (476-516)
- Sort items (518-577)
- Calculate statistics (580-618)

**Pagination Logic** (lines 620-903):
- Global pagination state (620-651)
- Group pagination state (652-716)
- Subgroup pagination state (717-844)
- Complex nested pagination rendering (845-903)

**Rendering** (lines 904-2114):
- View mode switching (904-950)
- Flat list view (951-1100)
- Grouped list view (1101-1400)
- Flat gallery view (1401-1600)
- Grouped gallery view (1601-1900)
- Modals (1901-2050)
- Utilities (2051-2114)

---

## Appendix B: Utility Functions Reference

### Already Created (Use These!)

**Navigation**:
```typescript
// lib/utils/navigationUtils.ts
buildContentUrl(params: ContentUrlParams): string
navigateToContent(router, params, options?)
```

**Content Types**:
```typescript
// lib/utils/contentTypeUtils.ts
getSourceApi(type: string): SourceApi
getContentType(type: string): ContentType
CONTENT_TYPE_CONFIG: Record<string, {...}>
```

**Components**:
```typescript
// app/_components/common/StatusBadge.tsx
<StatusBadge status={ItemStatus} variant="default" | "compact" />
```

---

### To Be Created

**Hooks**:
```typescript
// app/_hooks/useSmartNavigation.ts
useSmartNavigation(): (url: string) => (e: MouseEvent) => void

// app/_hooks/usePagination.ts
usePagination(items, pageSize): {
  currentPage, totalPages, currentItems,
  nextPage, prevPage, goToPage
}
```

**Components**:
```typescript
// app/_components/common/PaginationControls.tsx
<PaginationControls
  currentPage={1}
  totalPages={10}
  onPageChange={(page) => {}}
/>

// app/_components/common/LoadingCarousel.tsx
<LoadingCarousel title="Popular Movies" count={6} />
```

---

## Appendix C: Testing Strategy

### Unit Tests (Hooks & Utils)

```typescript
// Example: useListReordering.test.ts
describe('useListReordering', () => {
  it('should handle drag start', () => {
    const { result } = renderHook(() => useListReordering('list-1'));

    act(() => {
      result.current.handleDragStart(mockItem);
    });

    expect(result.current.draggedItem).toBe(mockItem);
  });

  it('should reorder items on drag end', async () => {
    // Test implementation
  });
});
```

---

### Integration Tests (Components)

```typescript
// Example: ListDetailPage.test.tsx
describe('ListDetailPage', () => {
  it('should render list in flat view mode', () => {
    render(<ListDetailPage listId="test-list" />);

    expect(screen.getByText('My List')).toBeInTheDocument();
    expect(screen.getAllByTestId('list-item-card')).toHaveLength(5);
  });

  it('should switch to gallery view', () => {
    render(<ListDetailPage listId="test-list" />);

    fireEvent.click(screen.getByLabelText('Gallery View'));

    expect(screen.getAllByTestId('gallery-item')).toHaveLength(5);
  });

  it('should paginate items', () => {
    // Test implementation
  });
});
```

---

## Appendix D: Commit Message Convention

Use conventional commits for clear history:

```bash
# Feature work
git commit -m "feat(lists): add subgroup pagination"

# Refactoring
git commit -m "refactor(ListDetailPage): extract useListData hook"
git commit -m "refactor(ListDetailPage): extract ListHeader component"

# Bug fixes
git commit -m "fix(pagination): correct total pages calculation"

# Documentation
git commit -m "docs(AGENTS): add comment policy guidelines"

# Tests
git commit -m "test(useListReordering): add drag and drop tests"

# Performance
git commit -m "perf(ContentCard): add useMemo for expensive computations"
```

---

## Conclusion

This migration plan provides a **systematic approach** to refactoring a codebase with severe SOLID violations into a **clean, maintainable, and testable** architecture.

**Key Success Factors**:
1. ✅ Incremental approach (don't refactor everything at once)
2. ✅ Continuous testing (verify after each step)
3. ✅ Clear priorities (tackle worst violations first)
4. ✅ Proper tooling (utilities, hooks, components)
5. ✅ Team alignment (follow guidelines consistently)

**Expected Outcomes**:
- 🎯 Zero components over 200 lines
- 🎯 100% type safety (no `any` types)
- 🎯 Minimal code duplication (DRY compliance)
- 🎯 Testable architecture (hooks and small components)
- 🎯 Better developer experience
- 🎯 Reduced bug risk
- 🎯 Faster feature development

**Timeline**: 4-6 weeks with proper testing and documentation.

**Start Date**: TBD
**Target Completion**: TBD

---

**Document Version**: 1.0
**Last Updated**: 2025-11-14
**Next Review**: After Phase 2 completion
