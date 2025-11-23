# Sprint 2 - Frontend Tasks (Week 5-6)

> **Sprint Goal:** Integrate backend improvements and build core UX features
> **Duration:** 2 weeks
> **Team:** Frontend

---

## ⚠️ PREREQUISITES

**Before starting this sprint, ensure:**

-   [ ] BE-101: Owner in members (Sprint 1) - DEPLOYED ✅
-   [ ] BE-102: Filter invalid seasons (Sprint 1) - DEPLOYED ✅
-   [ ] BE-103: Owner ratings (Sprint 1) - DEPLOYED ✅
-   [ ] BE-104: List count fix (Sprint 1) - DEPLOYED ✅
-   [ ] BE-201: Calculated ratings (Sprint 2) - DEPLOYED ✅
-   [ ] BE-202: Multi-search endpoint (Sprint 2) - DEPLOYED ✅
-   [ ] BE-203: Duplicate validation (Sprint 2) - DEPLOYED ✅

---

## 🔴 CRITICAL Tasks (Must Complete)

### FE-201: Redesign AddToListModal (Checkbox Behavior)

**Priority:** 🔴 CRITICAL (Major UX improvement)
**Estimate:** 3 days
**Owner:** _Assign_
**Uses Backend:** BE-203 (duplicate validation)

**Current UX Issues:**

-   Redundant "Cancel" button (X and DONE button exists)
-   Two-step process: select list → click "Add"
-   Modal closes after adding (can't add to multiple lists)
-   No visual feedback for which lists contain the item
-   Minimal metadata shown (just list name)

**New Design:**

**Visual:**

```
┌─────────────────────────────────────────┐
│  Add to Lists                        ✕  │
├─────────────────────────────────────────┤
│                                         │
│  ☑ Watchlist                            │
│     Personal • 47 items • Updated 2d ago│
│                                         │
│  ☐ Favorites                            │
│     Personal • 12 items • Updated 1w ago│
│                                         │
│  ☑ Sci-Fi Collection                    │
│     Collaborative • 89 items • 3 members│
│                                         │
│  ☐ Summer Binge                         │
│     Personal • 5 items • Updated 3w ago │
│                                         │
│  [+ Create New List]                    │
│                                         │
└─────────────────────────────────────────┘
```

**Behavior:**

1. Checked = item is in list
2. Click checkbox → instantly add/remove (no "Add" button)
3. Modal stays open (add to multiple lists)
4. Closes on click X/DONE or outside modal.

**Changes:**

```typescript
// Before: Two-step process
<Modal>
  <ListSelector onChange={setSelectedList} />
  <Button onClick={addToList}>Add</Button>
  <Button onClick={close}>Cancel</Button>  // ❌ Redundant
</Modal>

// After: One-step checkbox
<Modal>
  <Checkbox
    checked={isInList(list.id)}
    onChange={(checked) => {
      if (checked) addToList(list.id);
      else removeFromList(list.id);
    }}
  />
  <ListMetadata list={list} />
</Modal>
```

**File:** `app/_components/common/modals/AddToListModal/index.tsx`

**Implementation Tasks:**

-   [ ] Replace select dropdown with checkbox list
-   [ ] Remove "Cancel" and "Add" buttons
-   [ ] Add list metadata display (type, count, last updated)
-   [ ] Use BE-203 to check if item already in list
-   [ ] Show loading state while adding/removing
-   [ ] Error handling for BE-203 duplicate errors
-   [ ] Optimize re-renders (React.memo)

**Acceptance Criteria:**

-   [ ] Checkbox toggles add/remove instantly
-   [ ] No "Add" or "Cancel" buttons
-   [ ] Modal auto-closes after 2s no interaction
-   [ ] Shows: list type, item count, members (if collaborative)
-   [ ] Loading state during API calls
-   [ ] Error toast if add/remove fails
-   [ ] Works on mobile (checkboxes easy to tap)
-   [ ] Keyboard accessible (Space to toggle)

**Testing:**

-   [ ] Check list → item added → stays in modal
-   [ ] Uncheck list → item removed
-   [ ] Add to 3 lists in a row → all work
-   [ ] Duplicate prevention → shows error toast
-   [ ] Auto-close after 2s idle → closes
-   [ ] Click X → closes immediately

---

### FE-202: Implement Multi-level List Grouping

**Priority:** 🔴 CRITICAL (Core feature)
**Estimate:** 4 days
**Owner:** _Assign_
**Uses Backend:** None (client-side grouping)

**Current Behavior:**

-   Single-level/double grouping with select dropdowns
-   Can't group by multiple criteria
-   Confusing UI

**New Design:**

**Grouping Sidebar:**

```
┌───────────────────────────────┐
│  Group By                     │
├───────────────────────────────┤
│                               │
│  ☑ Status                     │
│  ☑ Content Type               │
│  ☐ Release Year               │
│  ☐ Rating                     │
│  ☐ Date Added                 │
│                               │
│  [Clear All Groups]           │
│                               │
└───────────────────────────────┘
```

**Result (Status → Content Type):**

```
📊 PENDING - 🎬 MOVIES (20 items)
├─ Inception
├─ The Matrix
└─ ...
📊 PENDING - 📺 TV SHOWS (15 items)
├─ Breaking Bad
└─ ...
📊 PENDING - 📺 Games (10 items)
└─ ...
✅ COMPLETED - 🎬 MOVIES (30 items)
└─ ...
✅ COMPLETED - :book: Books (30 items)
└─ ...
```

**File:** `app/_components/pages/ListDetailPage/components/ListSidebar.tsx`

**Implementation:**

```typescript
interface GroupingState {
    groups: GroupBy[]; // ['status', 'content_type', 'release_year']
    addGroup: (group: GroupBy) => void;
    removeGroup: (group: GroupBy) => void;
    clearGroups: () => void;
}

function groupItems(items: ListItem[], groups: GroupBy[]) {
    if (groups.length === 0) return items;

    // Recursively group by each level
    const [firstGroup, ...restGroups] = groups;
    const grouped = _.groupBy(items, firstGroup);

    if (restGroups.length === 0) return grouped;

    // Apply remaining groups to each sub-group
    return Object.entries(grouped).reduce((acc, [key, items]) => {
        acc[key] = groupItems(items, restGroups);
        return acc;
    }, {});
}
```

**Acceptance Criteria:**

-   [ ] Checkboxes instead of select dropdowns
-   [ ] Multi-select grouping - Only one level ("flat") (up to 3 attributes)
-   [ ] Collapsible group headers
-   [ ] Shows item count per group
-   [ ] "Clear All" button
-   [ ] REMOVE Persistence to preferences (localStorage)
-   [ ] Smooth animations on expand/collapse
-   [ ] Works with pagination
-   [ ] Mobile responsive

**Testing:**

-   [ ] Select 1 group → items grouped
-   [ ] Select 2 groups → items grouped by 2 conditions
-   [ ] Select 3 groups → items grouped by 3 conditions
-   [ ] Uncheck group → re-groups remaining
-   [ ] Clear all → fully flat list
-   [ ] Refresh page → groups persist

---

### FE-203: Integrate Multi-Search Endpoint

**Priority:** 🟡 HIGH (5x performance improvement)
**Estimate:** 2 days
**Owner:** _Assign_
**Uses Backend:** BE-202 (multi-search)

**Current Behavior:**
5 separate API calls per search:

```typescript
// ❌ SLOW: 5 sequential requests
const movies = await api.get(`/content/search/?type=MOVIE&q=${query}`);
const tvShows = await api.get(`/content/search/?type=TV_SHOW&q=${query}`);
const games = await api.get(`/content/search/?type=GAME&q=${query}`);
const music = await api.get(`/content/search/?type=MUSIC&q=${query}`);
const books = await api.get(`/content/search/?type=BOOK&q=${query}`);
```

**New Behavior:**
Single API call:

```typescript
// ✅ FAST: 1 request
const results = await api.get(
    "/content/search/multi/?query=inception?limit=20"
);

// results.movies
// results.tv_shows
// results.games
// etc.
```

NOTE: BAse yourself in /homepage response but with SearchItems in every list.

**File:** `app/_components/pages/SearchPage/index.tsx`

**Implementation:**

```typescript
// Create new hook
function useMultiSearch(query: string) {
  const [results, setResults] = useState<MultiSearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) return;

    const controller = new AbortController();
    setLoading(true);

    const search = async () => {
      try {
        const data = await api.get(..., { signal: controller.signal });
        setResults(data);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(search, 300);

    return () => {
      clearTimeout(debounce);
      controller.abort();
    };
  }, [query]);

  return { results, loading, error };
}
```

**Acceptance Criteria:**

-   [ ] Uses GET /api/content/search/multi/...
-   [ ] Single request instead of 5
-   [ ] Debounced (500ms)
-   [ ] Cancels previous request when user types
-   [ ] Shows loading state
-   [ ] Error handling
-   [ ] TypeScript interfaces for response
-   [ ] Works with existing search UI

---

## 🟡 HIGH PRIORITY Tasks

### FE-204: Display Calculated Ratings

**Priority:** 🟡 HIGH (Uses BE-201)
**Estimate:** 1 day
**Owner:** _Assign_
**Uses Backend:** BE-201 (list_rating, member_rating_count)

**Current Behavior:**
Frontend calculates averages client-side:

```typescript
// ❌ Client-side calculation
const listRating = useMemo(() => {
    const ratings = item.member_ratings.map((r) => r.rating);
    return ratings.reduce((a, b) => a + b, 0) / ratings.length;
}, [item.member_ratings]);
```

**New Behavior:**
Display pre-calculated values from backend:

```typescript
// ✅ Use backend values
const listRating = item.list_rating; // Already calculated
const ratingCount = item.member_rating_count;

<div>
    {listRating ? (
        <span>
            ★ {listRating.toFixed(1)} ({ratingCount} ratings)
        </span>
    ) : (
        <span>No ratings yet</span>
    )}
</div>;
```

**Files:**

-   `app/_components/pages/ListDetailPage/components/ListItem.tsx`
-   `app/_components/cards/ContentCard.tsx`

**Acceptance Criteria:**

-   [ ] Remove client-side calculation logic
-   [ ] Display backend-provided list_rating
-   [ ] Display member_rating_count
-   [ ] Handle null ratings (no ratings yet)
-   [ ] Format rating to 1 decimal place
-   [ ] Show count (e.g., "8.5 (12 ratings)")
-   [ ] Visual matches ContentDetailPage rating display

**Testing:**

-   [ ] Item with ratings → shows average
-   [ ] Item with 0 ratings → shows "No ratings"
-   [ ] Verify matches backend calculation

---

### FE-205: Show Duplicate Error Toast

**Priority:** 🟡 HIGH (Uses BE-203)
**Estimate:** 1 day
**Owner:** _Assign_
**Uses Backend:** BE-203 (duplicate validation)

**Current Behavior:**
No feedback when trying to add duplicate item.

**New Behavior:**
Show user-friendly error toast:

**Error Toast:**

```
┌─────────────────────────────────────────┐
│ ℹ️  This item is already in "Watchlist" │
└─────────────────────────────────────────┘
```

**Implementation:**

```typescript
const handleAddToList = async (listId: number) => {
    try {
        await addItemToList(listId, contentItemId);
        showToast("Added to list", "success");
    } catch (error) {
        if (error.response?.data?.error === "DUPLICATE_ITEM") {
            const existing = error.response.data.existing_item;
            showToast(`This item is already in this list`, "info");
        } else {
            showToast("Failed to add item", "error");
        }
    }
};
```

**Files:**

-   `app/_components/common/modals/AddToListModal/index.tsx`
-   Create: `app/_components/common/Toast.tsx` (if doesn't exist)

**Acceptance Criteria:**

-   [ ] Catches "DUPLICATE_ITEM" error from BE-203
-   [ ] Shows informative toast message
-   [ ] Toast auto-dismisses after 3s
-   [ ] Toast type is "info" (not error)
-   [ ] Includes when item was added
-   [ ] Toast positioned correctly (top-right)
-   [ ] Accessible (screen reader announces)

---

## 🟢 MEDIUM PRIORITY Tasks

### FE-206: Random List Names Generator

**Priority:** 🟢 MEDIUM (Fun feature)
**Estimate:** 0.5 days
**Owner:** _Assign_
**Uses Backend:** None

**Feature:**
Suggest random creative list names when user creates a list.

**Implementation:**

```typescript
const ADJECTIVES = [
  "Epic", "Cozy", "Wild", "Mystical", "Legendary",
  "Hidden", "Stellar", "Cosmic", "Ultimate", "Secret"
];

const NOUNS = [
  "Adventures", "Journeys", "Discoveries", "Treasures",
  "Memories", "Quests", "Stories", "Chronicles", "Gems"
];

function generateRandomListName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj} ${noun}`;
}

// In CreateListModal
<input
  placeholder={randomName}  // "Mystical Journeys"
  value={name}
  onChange={...}
/>
<Button onClick={() => setName(generateRandomListName())}>
  Generate Name
</Button>
```

**Acceptance Criteria:**

-   [ ] Shows random name as placeholder
-   [ ] "Generate Name" button
-   [ ] Re-generates on button click
-   [ ] User can still type custom name
-   [ ] Names are appropriate and family-friendly

---

### FE-207: Loading Skeletons for List Items

**Priority:** 🟢 LOW (Polish)
**Estimate:** 1 day
**Owner:** _Assign_
**Uses Backend:** None

**Create skeleton component:**

```typescript
function ListItemSkeleton() {
    return (
        <div className="animate-pulse">
            <div className="h-20 bg-gray-700 rounded mb-2" />
            <div className="h-4 bg-gray-600 rounded w-3/4" />
        </div>
    );
}

// In list view
{
    loading
        ? Array(10)
              .fill(0)
              .map((_, i) => <ListItemSkeleton key={i} />)
        : items.map((item) => <ListItem item={item} />);
}
```

**Acceptance Criteria:**

-   [ ] Skeleton matches real item layout
-   [ ] Pulse animation
-   [ ] Shows 10 skeletons while loading
-   [ ] Smooth transition to real content
-   [ ] Loading skeletons based on \*\*Placeholder.tsx files of Frontend (Card, FeatureBanner, etc)

## ✅ Definition of Done

-   [ ] Code implemented and tested locally
-   [ ] No console errors or warnings
-   [ ] Responsive (mobile + desktop)
-   [ ] Follows GUIDELINES.md
-   [ ] Code reviewed by teammate
-   [ ] Backend integration tested
-   [ ] Merged to feature branch
