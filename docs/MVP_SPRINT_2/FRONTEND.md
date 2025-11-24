# Sprint 2 - Frontend Tasks

> **Sprint Goal:** Integrate backend improvements and build core UX features

---

## ⚠️ PREREQUISITES

**Before starting this sprint, ensure:**

-   [x] BE-101: Owner in members (Sprint 1) - DEPLOYED ✅
-   [x] BE-102: Filter invalid seasons (Sprint 1) - DEPLOYED ✅
-   [x] BE-103: Owner ratings (Sprint 1) - DEPLOYED ✅
-   [x] BE-104: List count fix (Sprint 1) - DEPLOYED ✅
-   [x] BE-201: Calculated ratings (Sprint 2) - DEPLOYED ✅
-   [x] BE-202: Multi-search endpoint (Sprint 2) - DEPLOYED ✅
-   [x] BE-203: Duplicate validation (Sprint 2) - DEPLOYED ✅
-   [x] BE-204: Remove notes field (Sprint 2) - DEPLOYED ✅
-   [x] BE-205: Filter unreleased content (Sprint 2) - DEPLOYED ✅

---

## 📚 Backend Changes Summary (Sprint 2)

### 🚨 Breaking Changes

#### 1. `notes` Field Removed (BE-204)

The `notes` field has been completely removed from the database and all API responses.

**Before:**

```json
{
  "id": 123,
  "content_item": {...},
  "status": "PENDING",
  "notes": "Watch this next weekend"  // ❌ No longer exists
}
```

**After:**

```json
{
  "id": 123,
  "content_item": {...},
  "status": "PENDING"
}
```

**Action Required:**

-   Remove `notes` field from TypeScript interfaces
-   Remove any UI that displays or edits notes
-   Remove `notes` from POST/PATCH payloads

---

### ✨ New Backend Features

#### 1. Server-Side Rating Calculations (BE-201)

**Endpoint:** `GET /api/content/lists/{list_id}/items/`

The backend now pre-calculates `list_rating` and `member_rating_count`.

**Response:**

```json
{
  "id": 123,
  "status": "COMPLETED",
  "member_ratings": [
    {"user": {...}, "score": "8.5"},
    {"user": {...}, "score": "9.0"}
  ],
  "list_rating": 8.8,           // ✨ NEW: Pre-calculated average
  "member_rating_count": 2      // ✨ NEW: Pre-calculated count
}
```

**Rules:**

-   `list_rating` is **only present for COMPLETED items**
-   Returns `null` if no ratings exist
-   Only counts ratings from **list members** (including owner)

---

#### 2. Multi-Search Endpoint (BE-202)

**Endpoint:** `GET /api/proxy/search/multi/`

Search across all content types with a single API call.

**Before (5 requests):**

```typescript
const movies = await api.get("/api/proxy/movies/search/?query=inception");
const tvShows = await api.get("/api/proxy/tv-shows/search/?query=inception");
const games = await api.get("/api/proxy/games/search/?query=inception");
const albums = await api.get("/api/proxy/albums/search/?query=inception");
const books = await api.get("/api/proxy/books/search/?query=inception");
```

**After (1 request):**

```typescript
const results = await api.get('/api/proxy/search/multi/?query=inception&limit=20');

// Response structure (matches /homepage)
{
  "movies": [...],      // SearchItem[]
  "tv_shows": [...],    // SearchItem[]
  "games": [...],       // SearchItem[]
  "music": [...],       // SearchItem[] (renamed from "albums")
  "books": [...]        // SearchItem[]
}
```

**Query Parameters:**

| Parameter            | Type    | Required | Default | Description                                           |
| -------------------- | ------- | -------- | ------- | ----------------------------------------------------- |
| `query`              | string  | ✅ Yes   | -       | Search query                                          |
| `types`              | string  | No       | All     | Comma-separated: `MOVIES,TV_SHOWS,GAMES,ALBUMS,BOOKS` |
| `limit`              | integer | No       | 20      | Results per type (1-100)                              |
| `include_unreleased` | boolean | No       | false   | Include future releases                               |

**Examples:**

```typescript
// Search all types
GET /api/proxy/search/multi/?query=inception

// Search specific types
GET /api/proxy/search/multi/?query=inception&types=MOVIES,TV_SHOWS

// Custom limit
GET /api/proxy/search/multi/?query=inception&limit=10

// Include unreleased content
GET /api/proxy/search/multi/?query=dune&include_unreleased=true
```

---

#### 3. Duplicate Item Validation (BE-203)

**Endpoint:** `POST /api/content/lists/{list_id}/items/`

The backend now prevents duplicate items in the same list.

**Error Response (400):**

```json
{
    "error": "DUPLICATE_ITEM",
    "message": "This item is already in the list",
    "existing_item_id": 456,
    "existing_item": {
        "id": 456,
        "added_at": "2024-01-15T10:30:00Z",
        "status": "PENDING"
    }
}
```

**Frontend Handling:**

```typescript
try {
    await addItemToList(listId, contentItemId);
    toast.success("Added to list!");
} catch (error) {
    if (error.response?.data?.error === "DUPLICATE_ITEM") {
        toast.info("This item is already in the list");
        // Optionally scroll to existing item
    } else {
        toast.error("Failed to add item");
    }
}
```

---

#### 4. Unreleased Content Filtering (BE-205)

All search endpoints now filter out content with **future release dates** by default.

**Rules:**

-   ✅ Included: Items with `null` release date
-   ✅ Included: Items with `release_date <= today + 1 day`
-   ❌ Excluded: Items with `release_date > today + 1 day`

**Override with Parameter:**

```typescript
// Default: Filter out unreleased
GET /api/proxy/search/multi/?query=dune
// Returns: Dune (2021), Dune: Part Two (2024)

// Include unreleased
GET /api/proxy/search/multi/?query=dune&include_unreleased=true
// Also returns: Dune: Part Three (2026)
```

---

### 🔄 Updated TypeScript Interfaces

```typescript
// interfaces/listItem.ts

export interface ListItem {
    id: number;
    user_list: number;
    list_order: number;
    content_item: ContentItem;
    added_by: User;
    status: "PENDING" | "COMPLETED";
    added_at: string;
    completed_at: string | null;

    // ✨ NEW FIELDS (from BE-201)
    member_ratings: MemberRating[];
    list_rating: number | null; // Only present for COMPLETED items
    member_rating_count: number;

    // ❌ REMOVED (BE-204)
    // notes?: string;  // Delete this line
}

export interface MemberRating {
    user: User;
    score: string; // "8.5", "9.0", etc.
    comment: string | null;
    created_at: string;
    updated_at: string;
    is_owner: boolean;
}

// ✨ NEW: Multi-search types (BE-202)
export interface MultiSearchParams {
    query: string;
    types?: string; // "MOVIES,TV_SHOWS,GAMES,ALBUMS,BOOKS"
    limit?: number; // 1-100
    include_unreleased?: boolean;
}

export interface MultiSearchResponse {
    movies: SearchItem[];
    tv_shows: SearchItem[];
    games: SearchItem[];
    music: SearchItem[]; // Note: "music" not "albums"
    books: SearchItem[];
}
```

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

**Backend Integration (BE-203):**

```typescript
async function handleCheckboxChange(listId: number, checked: boolean) {
    try {
        if (checked) {
            // Add to list
            await api.post(`/api/content/lists/${listId}/items/`, {
                source_api: item.source_api,
                external_id: item.external_id,
                content_type: item.content_type,
            });
            toast.success("Added to list");
        } else {
            // Remove from list
            await api.delete(`/api/content/lists/${listId}/items/${itemId}/`);
            toast.success("Removed from list");
        }
    } catch (error) {
        if (error.response?.data?.error === "DUPLICATE_ITEM") {
            // Item already in list - check the checkbox but show info
            toast.info("This item is already in the list");
        } else {
            toast.error("Failed to update list");
        }
    }
}
```

**Acceptance Criteria:**

-   [ ] Checkbox toggles add/remove instantly
-   [ ] No "Add" or "Cancel" buttons
-   [ ] Modal auto-closes after 2s no interaction
-   [ ] Shows: list type, item count, members (if collaborative)
-   [ ] Loading state during API calls
-   [ ] Error toast if add/remove fails (using BE-203 error format)
-   [ ] Works on mobile (checkboxes easy to tap)
-   [ ] Keyboard accessible (Space to toggle)

**Testing:**

-   [ ] Check list → item added → stays in modal
-   [ ] Uncheck list → item removed
-   [ ] Add to 3 lists in a row → all work
-   [ ] Duplicate prevention → shows error toast (BE-203)
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
// ✅ FAST: 1 request (BE-202)
const results = await api.get('/api/proxy/search/multi/', {
  params: {
    query: 'inception',
    limit: 20  // Optional: results per type
  }
});

// Response structure (matches /homepage)
{
  movies: SearchItem[],      // Note: Same structure as homepage
  tv_shows: SearchItem[],
  games: SearchItem[],
  music: SearchItem[],       // Note: renamed from "albums"
  books: SearchItem[]
}
```

**Backend Features (BE-202):**

-   All searches run in **parallel** (not sequential)
-   Supports filtering by `types` parameter: `?types=MOVIES,TV_SHOWS`
-   Supports `limit` per type: `?limit=10` (default: 20, max: 100)
-   Supports `include_unreleased` (BE-205): `?include_unreleased=true`

**File:** `app/_components/pages/SearchPage/index.tsx`

**Implementation:**

```typescript
// Create new API function
export async function multiSearch(
    params: MultiSearchParams
): Promise<MultiSearchResponse> {
    const response = await axios.get("/api/proxy/search/multi/", { params });
    return response.data;
}

// Create new hook
function useMultiSearch(query: string) {
    const [results, setResults] = useState<MultiSearchResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!query) return;

        const controller = new AbortController();
        setLoading(true);

        const search = async () => {
            try {
                const data = await multiSearch({
                    query,
                    limit: 20, // Optional
                });
                setResults(data);
            } catch (err) {
                if (err.name !== "AbortError") {
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

// Usage in component
function SearchPage() {
    const [query, setQuery] = useState("");
    const { results, loading, error } = useMultiSearch(query);

    return (
        <div>
            <SearchInput value={query} onChange={setQuery} />
            {loading && <Loader />}
            {error && <ErrorMessage error={error} />}
            {results && (
                <>
                    <Section title="Movies" items={results.movies} />
                    <Section title="TV Shows" items={results.tv_shows} />
                    <Section title="Games" items={results.games} />
                    <Section title="Music" items={results.music} />
                    <Section title="Books" items={results.books} />
                </>
            )}
        </div>
    );
}
```

**Acceptance Criteria:**

-   [ ] Uses `GET /api/proxy/search/multi/` (BE-202)
-   [ ] Single request instead of 5
-   [ ] Debounced (300ms)
-   [ ] Cancels previous request when user types
-   [ ] Shows loading state
-   [ ] Error handling
-   [ ] TypeScript interfaces for response
-   [ ] Works with existing search UI
-   [ ] Response structure matches `/homepage` format

**Performance Target:**

-   Search response time: < 500ms for all 5 types
-   Network waterfall: 1 request (not 5)

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
// ❌ Client-side calculation (REMOVE THIS)
const listRating = useMemo(() => {
    const ratings = item.member_ratings.map((r) => r.rating);
    return ratings.reduce((a, b) => a + b, 0) / ratings.length;
}, [item.member_ratings]);
```

**New Behavior:**
Display pre-calculated values from backend (BE-201):

```typescript
// ✅ Use backend values (BE-201)
const listRating = item.list_rating; // Already calculated!
const ratingCount = item.member_rating_count;

// Display component
<div>
    {item.status === "COMPLETED" && (
        <>
            {listRating !== null ? (
                <span>
                    ★ {listRating.toFixed(1)} ({ratingCount} ratings)
                </span>
            ) : (
                <span>No ratings yet</span>
            )}
        </>
    )}
</div>;
```

**Backend Rules (BE-201):**

-   `list_rating` is **only present for COMPLETED items**
-   Returns `null` if no ratings exist
-   Already rounded to 1 decimal place
-   Only includes ratings from **list members** (owner + members)

**Files:**

-   `app/_components/pages/ListDetailPage/components/ListItem.tsx`
-   `app/_components/cards/ContentCard.tsx`

**Acceptance Criteria:**

-   [ ] Remove client-side calculation logic
-   [ ] Display backend-provided `list_rating` (BE-201)
-   [ ] Display `member_rating_count` (BE-201)
-   [ ] Handle `null` ratings (no ratings yet)
-   [ ] Format rating to 1 decimal place
-   [ ] Show count (e.g., "8.5 (12 ratings)")
-   [ ] Visual matches ContentDetailPage rating display
-   [ ] Only show for COMPLETED items

**Testing:**

-   [ ] Item with ratings → shows average from BE-201
-   [ ] Item with 0 ratings → shows "No ratings"
-   [ ] PENDING item → doesn't show ratings
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
Show user-friendly error toast using BE-203 error response:

**Error Toast:**

```
┌─────────────────────────────────────────┐
│ ℹ️  This item is already in "Watchlist" │
└─────────────────────────────────────────┘
```

**Backend Error Response (BE-203):**

```json
{
    "error": "DUPLICATE_ITEM",
    "message": "This item is already in the list",
    "existing_item_id": 456,
    "existing_item": {
        "id": 456,
        "added_at": "2024-01-15T10:30:00Z",
        "status": "PENDING"
    }
}
```

**Implementation:**

```typescript
const handleAddToList = async (listId: number) => {
    try {
        await addItemToList(listId, contentItemId);
        showToast("Added to list", "success");
    } catch (error) {
        // Handle BE-203 duplicate error
        if (error.response?.data?.error === "DUPLICATE_ITEM") {
            const existing = error.response.data.existing_item;
            const addedDate = new Date(existing.added_at).toLocaleDateString();
            showToast(
                `This item is already in this list (added ${addedDate})`,
                "info"
            );
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

---

## 📝 Backend API Reference

### Updated Endpoints

#### `GET /api/content/lists/{list_id}/items/`

-   ✨ Added `list_rating` (float | null)
-   ✨ Added `member_rating_count` (integer)
-   ❌ Removed `notes` field

#### `POST /api/content/lists/{list_id}/items/`

-   ✨ Returns 400 with `DUPLICATE_ITEM` error if duplicate
-   ❌ No longer accepts `notes` field

### New Endpoints

#### `GET /api/proxy/search/multi/`

**Description:** Search across all content types in parallel

**Parameters:**

-   `query` (required): Search string
-   `types` (optional): Comma-separated types (MOVIES,TV_SHOWS,GAMES,ALBUMS,BOOKS)
-   `limit` (optional): Results per type (default: 20, max: 100)
-   `include_unreleased` (optional): Include future releases (default: false)

**Response:** Same structure as `/homepage` response

---

**For detailed backend documentation, see:** `CLAUDE.md`
**API Documentation:** http://localhost:8000/api/swagger/
