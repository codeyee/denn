# TODO - DENN Project

> **Last Updated:** 2025-11-15
> **Status:** Pre-Open Source Release
> **Target:** Industry-grade, production-ready codebase

---

## 📋 Table of Contents

- [🚨 CRITICAL - Security & Stability](#-critical---security--stability)
- [🔴 HIGH PRIORITY - Code Quality & Standards](#-high-priority---code-quality--standards)
- [🟡 MEDIUM PRIORITY - Backend Dependencies](#-medium-priority---backend-dependencies)
- [🟢 FRONTEND - UX & Performance](#-frontend---ux--performance)
- [🔵 FRONTEND - Organization & Final MVP](#-frontend---organization--final-mvp)
- [🎯 FUTURE FEATURES](#-future-features)
- [🔍 AUDIT FINDINGS - Technical Debt](#-audit-findings---technical-debt)

---

## 🚨 CRITICAL - Security & Stability

### Security Vulnerabilities (BLOCKER for Open Source)

- [ ] **XSS - Remove `dangerouslySetInnerHTML`**
  **File:** `app/_components/pages/LandingPage/components/DomeGallery/index.tsx:141`
  **Risk:** CSS injection vulnerability
  **Action:** Replace with CSS modules or Tailwind classes
  **Priority:** 🔴 CRITICAL

- [ ] **Unsafe JSON Parsing - Add Error Handling**
  **Files:**
  - `app/_components/pages/ContentDetailPage/index.tsx:88`
  - `app/_components/pages/ContentDetailPage/hooks/useContentData.ts:67`
  **Risk:** Malformed JSON will crash the application
  **Action:** Wrap all `JSON.parse()` calls in try-catch blocks with Zod validation
  **Priority:** 🔴 CRITICAL

  ```typescript
  // Replace with:
  try {
    const parsed = JSON.parse(item.source_data);
    const validated = SourceDataSchema.parse(parsed); // Zod validation
    sourceData = validated;
  } catch (e) {
    console.error("Invalid source data format", e);
    sourceData = null;
  }
  ```

- [ ] **Race Condition - Direct fetch() in Component**
  **File:** `app/_components/pages/LandingPage/components/Background.tsx:40-54`
  **Risk:** Memory leaks if component unmounts during fetch
  **Action:** Add AbortController cleanup

  ```typescript
  useEffect(() => {
    const controller = new AbortController();
    const fetchImages = async () => {
      try {
        const response = await fetch("/api/cards", {
          signal: controller.signal
        });
        if (response.ok) {
          const images = await response.json();
          setBackgroundImages(images);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error(err);
        }
      }
    };
    fetchImages();
    return () => controller.abort();
  }, []);
  ```

- [ ] **Remove ALL console.log/error Statements in Production**
  **Files:** 35+ occurrences across codebase
  **Risk:** Exposes sensitive errors, debugging info to end users
  **Action:** Replace with proper error tracking (Sentry, LogRocket) or remove entirely
  **Key locations:**
  - `lib/api/api.ts:161` - Token refresh errors
  - `app/_stores/auth-store.ts:155,192` - Auth errors
  - `app/_components/pages/ContentDetailPage/index.tsx:185` - Success logs
  - All `useContentData.ts` console.warn/error calls

- [ ] **Token Refresh - Add Timeout Handling**
  **File:** `lib/api/api.ts:11-45`
  **Risk:** Infinite hangs if refresh endpoint is slow/down
  **Action:** Add timeout to token refresh promise

  ```typescript
  const refreshWithTimeout = Promise.race([
    performTokenRefresh(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Token refresh timeout')), 10000)
    )
  ]);
  ```

- [ ] **localStorage Token Validation on Rehydration**
  **File:** `app/_stores/auth-store.ts:189-198`
  **Risk:** Expired tokens loaded from localStorage add latency
  **Action:** Validate JWT expiration before using stored tokens

  ```typescript
  onRehydrateStorage: () => {
    return (state, error) => {
      if (error) {
        console.error("Error rehydrating auth store:", error);
      }
      // Validate token expiration
      if (state?.accessToken) {
        const decoded = jwt_decode(state.accessToken);
        if (decoded.exp * 1000 < Date.now()) {
          // Token expired, clear it
          useAuthStore.setState({
            accessToken: null,
            isAuthenticated: false
          });
        }
      }
      setTimeout(() => {
        useAuthStore.setState({ isLoading: false });
      }, 0);
    };
  }
  ```

- [ ] **Input Validation - Sanitize User Input**
  **Files:** All form components
  **Risk:** Potential XSS if user input rendered without escaping
  **Action:** Add DOMPurify for any user-generated content displayed as HTML

- [ ] **CSRF Protection - Add Token Headers**
  **File:** `lib/api/api.ts:104-114`
  **Risk:** Cross-site request forgery attacks
  **Action:** Add CSRF token header for all authenticated requests (if backend supports it)

- [ ] **Environment Variables - Audit Exposure**
  **File:** All files using `process.env.NEXT_PUBLIC_*`
  **Risk:** `NEXT_PUBLIC_` vars are exposed to browser
  **Action:** Ensure no sensitive data in public env vars, document which vars are intentionally public

---

## 🔴 HIGH PRIORITY - Code Quality & Standards

### GUIDELINES.md Compliance (Components >200 Lines)

- [ ] **Refactor ListSidebar Component (334 lines → <200)**
  **File:** `app/_components/pages/ListDetailPage/components/ListSidebar.tsx`
  **Violation:** 67% over limit
  **Action:** Extract sub-components:
  - `ListSidebarStats.tsx` - Statistics section
  - `ListSidebarFilters.tsx` - Filter controls
  - `ListSidebarActions.tsx` - Action buttons
  - `ListSidebarMembers.tsx` - Members section

- [ ] **Refactor DomeGallery Component (286 lines → <200)**
  **File:** `app/_components/pages/LandingPage/components/DomeGallery/index.tsx`
  **Violation:** 43% over limit
  **Action:** Extract:
  - `DomeGalleryImage.tsx` - Individual image tile
  - `DomeGalleryModal.tsx` - Modal content
  - Move styles to CSS module

- [ ] **Refactor useDomeImageModal Hook (341 lines → <100)**
  **File:** `app/_components/pages/LandingPage/components/DomeGallery/hooks/useDomeImageModal.ts`
  **Violation:** 71% over limit for a hook
  **Action:** Split into:
  - `useDomeImageState.ts` - State management
  - `useDomeImageGestures.ts` - Gesture handling
  - `useDomeImageAnimation.ts` - Animation logic

- [ ] **Refactor ListDetailPage (403 lines → <200)**
  **File:** `app/_components/pages/ListDetailPage/index.tsx`
  **Violation:** 101% over limit
  **Action:** Already has 8 hooks, extract more UI components:
  - `ListDetailContent.tsx` - Main content renderer
  - `ListDetailModals.tsx` - All modal components grouped
  - Verify all business logic is in hooks

- [ ] **Review AddToListModal (220 lines → <200)**
  **File:** `app/_components/common/modals/AddToListModal/index.tsx`
  **Violation:** 10% over limit
  **Action:** Extract:
  - `AddToListModalContent.tsx` - List selection UI
  - `AddToListModalActions.tsx` - TV show/season actions

### TypeScript Strict Mode Violations

- [ ] **Remove Type Assertions (`as`) - 6+ files**
  **Files:**
  - `app/_components/pages/SearchPage/utils.ts`
  - `app/_components/common/ui/StatusBadge.tsx`
  - `app/_components/common/cards/Card/index.tsx`
  - `app/_components/common/modals/ConfirmDialog.tsx`
  - `app/_components/pages/ContentDetailPage/components/SeasonsSection.tsx`
  **Action:** Replace with type guards or proper discriminated unions

  ```typescript
  // Instead of:
  const item = data as ContentItem;

  // Use:
  function isContentItem(data: unknown): data is ContentItem {
    return typeof data === 'object' && data !== null && 'id' in data;
  }
  if (isContentItem(data)) {
    // TypeScript knows data is ContentItem here
  }
  ```

- [ ] **Fix Implicit Type Coercions**
  **Files:** Multiple locations with unsafe CSS property assignments
  **Action:** Use proper TypeScript types for all CSS-in-JS

### DRY Violations (Code Duplication)

- [ ] **Extract Loading State Component**
  **Duplicated in:**
  - `ListDetailPage/index.tsx:150-166`
  - `ContentDetailPage/index.tsx:50-62`
  - `Profile/page.tsx`
  - `Search/page.tsx`
  **Action:** Create `app/_components/common/state/LoadingState.tsx`

  ```typescript
  export function LoadingState({ message = "Loading..." }: { message?: string }) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p className="text-gray-400">{message}</p>
        </div>
      </div>
    );
  }
  ```

- [ ] **Extract Error State Component**
  **Action:** Create `app/_components/common/state/ErrorState.tsx`

- [ ] **Consolidate Token Management Logic**
  **Duplicated in:**
  - `app/_stores/auth-store.ts:57-63,95-106`
  - `lib/api/api.ts:20-32,143-150`
  **Action:** Create single source of truth for token headers

### Missing Error Boundaries

- [ ] **Create Route-Level Error Boundaries**
  **Missing files:**
  - `app/error.tsx` - Root error boundary
  - `app/lists/[id]/error.tsx` - List detail error
  - `app/content/error.tsx` - Content detail error
  - `app/search/error.tsx` - Search error
  - `app/profile/error.tsx` - Profile error
  **Action:** Create error.tsx for all major routes

  ```typescript
  // app/lists/[id]/error.tsx
  'use client';

  export default function Error({
    error,
    reset,
  }: {
    error: Error & { digest?: string };
    reset: () => void;
  }) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
        <p className="text-gray-400 mb-4">{error.message}</p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
        >
          Try again
        </button>
      </div>
    );
  }
  ```

- [ ] **Create Route-Level Loading States**
  **Missing files:**
  - `app/lists/[id]/loading.tsx`
  - `app/content/loading.tsx`
  - `app/search/loading.tsx`
  - `app/profile/loading.tsx`

### Performance Optimizations

- [ ] **Add React.memo to Card Components**
  **Files:**
  - `app/_components/common/cards/Card/index.tsx`
  - `app/_components/cards/ContentCard.tsx`
  - `app/_components/cards/ListCard.tsx`
  - `app/_components/cards/EpisodeCard.tsx`
  **Action:** Wrap with `React.memo()` to prevent unnecessary re-renders in carousels

  ```typescript
  export const Card = React.memo(function Card(props: CardProps) {
    // ... component code
  });
  ```

- [ ] **Add useCallback to Event Handlers**
  **File:** `app/_components/pages/ListDetailPage/index.tsx:107-149`
  **Action:** Wrap all handler functions with useCallback

  ```typescript
  const handlePrimaryGroupChange = useCallback((group: GroupBy) => {
    if (group === "none") clearGroupBy();
    else setGroupBy([group, ...groupBy.slice(1)]);
    setCurrentPage(1);
    pagination.resetPagination();
  }, [clearGroupBy, setGroupBy, groupBy, setCurrentPage, pagination]);
  ```

- [ ] **Fix Missing useMemo Dependencies**
  **File:** `app/_components/pages/ListDetailPage/index.tsx:86`
  **Action:** Add all dependencies to useMemo arrays

- [ ] **Optimize Image Loading - Remove `unoptimized` Prop**
  **File:** `app/_components/pages/LandingPage/components/DomeGallery/index.tsx:224`
  **Action:** Remove `unoptimized` and provide proper width/height instead of `fill`

  ```typescript
  <Image
    src={it.src}
    alt={it.alt}
    width={400}
    height={600}
    className="object-cover pointer-events-none"
    sizes="(max-width: 768px) 25vw, 20vw"
    // Removed: unoptimized
  />
  ```

- [ ] **Implement Request Deduplication**
  **Action:** Prevent multiple identical API requests from firing simultaneously
  **Files:** All components that make API calls
  **Solution:** Use SWR or React Query for automatic deduplication

- [ ] **Add Optimistic Updates**
  **Files:** List operations (add, delete, reorder items)
  **Action:** Update UI immediately before API response for better UX

### ESLint Rule Suppressions (Fix Root Causes)

- [ ] **Fix Hook Dependencies Instead of Disabling**
  **File:** `app/_components/common/modals/AddToListModal/index.tsx:65`

  ```typescript
  // Remove this:
  // eslint-disable-next-line react-hooks/exhaustive-deps

  // Fix the actual dependency array
  ```

- [ ] **Fix setState in useEffect**
  **File:** `app/_components/common/cards/EpisodeCard.tsx`
  **Action:** Remove setState from useEffect or add proper cleanup

---

## 🟡 MEDIUM PRIORITY - Backend Dependencies

> **Note:** These issues require backend API changes. Coordinate with backend team.

### Backend API Fixes Required

- [ ] **Backend: Include OWNER in MEMBERS list**
  **Issue:** Owner is not included in list.members, causing bugs in permissions/UI
  **Action:** Backend should include owner in members array for all lists (personal & collaborative)
  **Impact:** Fixes multiple frontend bugs related to member permissions

- [ ] **Backend: Filter Invalid TV Seasons**
  **Endpoint:** `/api/content/{id}/`
  **Issue:** Returns seasons with 0 episodes or future release dates
  **Action:** Backend should NOT return:
  - Seasons with 0 episodes
  - Seasons with only 1 episode without release date
  - Seasons with only 1 episode with future release date
  - Seasons with future release dates (unless they have >1 episode)

- [ ] **Backend: Remove `notes` from List Items**
  **Action:** Deprecate `notes` field from list_items table/API
  **Reason:** Not used in current UI design

- [ ] **Backend: Return Owner's Ratings in `member_ratings`**
  **Issue:** Owner's ratings not included in member_ratings array
  **Action:** Include owner's rating in member_ratings for consistency

- [ ] **Backend: Calculate `list_rating` and `member_rating_count`**
  **Endpoint:** `/api/lists/{id}/items/`
  **Action:** Backend should calculate and return:
  - `list_rating` (average of all member ratings)
  - `member_rating_count` (count of members who rated)
  **Reason:** Avoid N+1 queries on frontend

- [ ] **Backend: Filter Future Release Dates**
  **Endpoints:** All content endpoints
  **Action:** Do NOT return content items that:
  - Have `release_date` > (today + 1 day) [1-day margin for timezone issues]
  - Have `release_date` = null
  **Reason:** Prevents showing unreleased content

- [ ] **Backend: Create Multi-Search Endpoint**
  **Endpoint:** `POST /api/content/multi-search/`
  **Current Issue:** Frontend makes 5 separate API calls for each search
  **Action:** Create single endpoint that searches across all content types
  **Payload:**

  ```json
  {
    "query": "Inception",
    "content_types": ["MOVIE", "TV_SHOW", "GAME", "MUSIC", "BOOK"]
  }
  ```

  **Response:**

  ```json
  {
    "movies": [...],
    "tv_shows": [...],
    "games": [...],
    "music": [...],
    "books": [...]
  }
  ```

- [ ] **Backend: Check Item in User's Lists Endpoint**
  **Endpoint:** `GET /api/lists/check-item/?content_item_id={id}&user_id={user_id}`
  **Purpose:** Check if a content item is in ANY of the user's lists
  **Response:**

  ```json
  {
    "in_lists": [
      { "id": 1, "name": "Watchlist" },
      { "id": 5, "name": "Favorites" }
    ]
  }
  ```

- [ ] **Backend: Validate Duplicate Items**
  **Action:** Backend should return 400 error if item already exists in list
  **Current Issue:** Frontend doesn't get feedback if duplicate items added

- [ ] **Backend: Implement Search Caching (Lowercase)**
  **Action:** Cache search results with case-insensitive keys
  **Example:** "inception", "Inception", "INCEPTION" → same cache entry

- [ ] **Backend: Add Retry Logic**
  **Action:** Implement exponential backoff for external API calls (TMDB, Spotify, IGDB, etc.)

- [ ] **Backend: Random List Items Endpoint**
  **Endpoint:** `GET /api/lists/{id}/items/random/?count={n}&status=PENDING`
  **Purpose:** Get N random items from a list with specific status
  **Use Case:** "Pick random item from my watchlist" feature

- [ ] **Backend: Fix Homepage List Preview**
  **Endpoint:** `GET /api/lists/?items_size={n}`
  **Issue:** Should return random N items, not first N items
  **Action:** Randomize the items returned for preview

- [ ] **Backend: Fix Homepage List Count**
  **Endpoint:** `GET /api/lists/?items_size={n}`
  **Issue:** Returns `item_count` = items_size instead of actual total count
  **Action:** Return actual total count regardless of items_size

---

## 🟢 FRONTEND - UX & Performance

### Loading States & Placeholders

- [ ] **Add Skeleton Placeholders for List Items**
  **Files:**
  - `app/_components/pages/ListDetailPage/components/ListView/FlatListView.tsx`
  - `app/_components/pages/ListDetailPage/components/ListView/GroupedListView.tsx`
  **Action:** Show loading skeletons while items are fetching (similar to homepage)

- [ ] **Add Skeleton Placeholders for Content Detail**
  **File:** `app/_components/pages/ContentDetailPage/index.tsx`
  **Action:** Replace generic spinner with structured skeleton matching page layout

### Search Page

- [ ] **Cancel Debounced Requests**
  **File:** `app/_components/pages/SearchPage/index.tsx`
  **Issue:** Previous search requests not cancelled when user types
  **Action:** Use AbortController to cancel in-flight requests on new search

  ```typescript
  useEffect(() => {
    const controller = new AbortController();
    const delaySearch = setTimeout(() => {
      performSearch(query, { signal: controller.signal });
    }, 300);
    return () => {
      clearTimeout(delaySearch);
      controller.abort();
    };
  }, [query]);
  ```

- [ ] **Show "No Items Found" Instead of Hiding Section**
  **Action:** When search returns 0 results for a content type, show "No movies found" instead of hiding the entire section

### Homepage

- [ ] **Make Card Previews Expandable on Hover**
  **File:** `app/_components/cards/ListCard.tsx` (or equivalent)
  **Issue:** Homepage list cards don't expand on hover like content cards do
  **Action:** Add same hover effect as content cards

### List Detail Page

- [ ] **Fix Rating Modal in Lists - Allow Half Stars**
  **File:** `app/_components/common/modals/RateItemModal.tsx`
  **Issue:** Only allows full star ratings, should allow 0.5 increments
  **Action:** Reuse the same rating component from ContentDetailPage (supports half stars)

- [ ] **Remove "Toggle Animations" Setting**
  **File:** `app/_stores/settings-store.ts`
  **Action:** Remove entire settings store if this is the only setting
  **Reason:** Animation toggle not needed for MVP

- [ ] **Fix List Grouping UI**
  **File:** `app/_components/pages/ListDetailPage/components/ListSidebar.tsx`
  **Issues:**
  - Remove "theme" from preferences (not used)
  - Fix pagination button styling in grouped view
  - Fix group title styling
  - Replace select dropdowns with checkboxes for multi-level grouping
  - Allow N-level grouping (e.g., group by Status → Content Type → Release Year)

- [ ] **Auto-generate Random List Names**
  **File:** `app/_components/common/modals/CreateListModal.tsx`
  **Action:** When creating list, suggest random creative names if user leaves name blank
  **Example word list:**

  ```typescript
  const ADJECTIVES = ["Epic", "Cozy", "Wild", "Mystical", "Legendary"];
  const NOUNS = ["Adventures", "Journeys", "Discoveries", "Treasures", "Memories"];
  const randomName = `${random(ADJECTIVES)} ${random(NOUNS)}`;
  ```

### Add to List Modal

- [ ] **Redesign Add to List Modal**
  **File:** `app/_components/common/modals/AddToListModal/index.tsx`
  **Changes:**
  - Remove "Cancel" button (redundant with X close button)
  - Change to checkbox behavior: click list = toggle add/remove (no separate "Add" button)
  - Remove "Your lists" header text
  - Show more metadata per list (item count, last updated, list type icon)
  - Don't close modal when adding to a list (allow multiple selections)
  - Replace "Done" button with auto-close after 2s of inactivity

- [ ] **Fix TV Show Addition Check**
  **Issue:** When selecting "Add TV Show" option, doesn't check if show is already in list
  **Action:** Make API call to check if show exists in list before adding

### Content Detail Page

- [ ] **Fix "Rate this item" Prompt - Only Show if Not Rated**
  **File:** `app/_components/pages/ContentDetailPage/components/AboutSection.tsx` (or similar)
  **Issue:** "Rate this item" appears even after user has rated
  **Action:** Only show prompt if `userRating` is null/undefined
  **Enhancement:** When user marks item as COMPLETED and hasn't rated it, show modal asking for rating

- [ ] **Consolidate Rating API Calls**
  **File:** `app/_components/pages/ContentDetailPage/components/RatingsSection.tsx:40-44`
  **Issue:** Makes 2 separate API calls:
  - `/content/ratings/?content_item_id=xx&page=1&page_size=10`
  - `/content/ratings/?content_item_id=xx&user_id=1&page_size=1`
  **Action:** Backend should return user's rating in the main ratings list with a flag

- [ ] **Fix "Where to Watch" Platform Alignment**
  **File:** Component showing streaming platforms
  **Issue:** Platform logos are misaligned
  **Action:** Use CSS Grid with fixed width per item or flexbox with proper spacing

- [ ] **Map "Where to Play" Platform Images**
  **Action:** Create local mapping of platform IDs → logo images in frontend
  **Reason:** Avoid depending on external CDN for platform logos

- [ ] **Add Gallery Modal (Image Expansion)**
  **File:** `app/_components/pages/ContentDetailPage/components/GallerySection.tsx`
  **Feature:** Click on gallery image → opens full-screen modal with image
  **Action:** Create `ImageModal.tsx` component with:
  - Full-screen overlay
  - Image zoom/pan controls
  - Arrow navigation for gallery
  - ESC key to close

- [ ] **Fix AddToListModal Overflow on Small Screens**
  **File:** `app/_components/common/modals/AddToListModal/index.tsx`
  **Issue:** "Add TV Show" / "Add Individual Seasons" buttons overflow modal on mobile
  **Action:** Make buttons stack vertically on small screens

### Card Hover Effects

- [ ] **Show Metadata on Hover (Not Description)**
  **File:** `app/_components/common/cards/Card/index.tsx`
  **Action:** On hover, show metadata (year, rating, runtime) instead of long description

- [ ] **Change "Add to List" Button Icon**
  **Action:** Make button more visually distinct, add cursor pointer

- [ ] **Show Full Title on Hover (Don't Truncate)**
  **Action:** Expand card or show tooltip with full title if truncated

### Homepage Optimizations

- [ ] **Use `page_size=0` to Fetch All User Lists**
  **File:** Homepage component
  **Issue:** Currently fetches paginated lists
  **Action:** If backend supports `page_size=0` → returns all lists, use that for homepage

- [ ] **Optimize Homepage Navigation**
  **Issue:** Clicking on a list delays before navigation (makes API call first)
  **Action:** Navigate immediately to list page, let list page fetch its own data

### List Detail - Background Data Fetching

- [ ] **Non-blocking Full List Fetch**
  **File:** `app/_components/pages/ListDetailPage/hooks/useListData.ts`
  **Feature:** While showing paginated items, fetch full list in background
  **Use Case:** User can start interacting with page 1 while page 2-N loads silently
  **Action:**

  ```typescript
  useEffect(() => {
    // Fetch current page immediately (blocking)
    fetchPage(currentPage);

    // Fetch all items in background (non-blocking)
    fetchAllItems({ background: true });
  }, [listId]);
  ```

---

## 🔵 FRONTEND - Organization & Final MVP

### Styling Consistency

- [ ] **Standardize Font Usage**
  **Action:** Use `font-sans` for all body text
  **Keep current fonts ONLY for:**
  - Page titles (h1)
  - Section headers (h2, h3)
  - Button labels
  **Files to update:** All components with custom font classes

- [ ] **Standardize Color Palette**
  **File:** `app/globals.css`
  **Action:**
  - Audit all color usages in components
  - Replace hardcoded colors with CSS variables
  - Document color system in `GUIDELINES.md`

  ```css
  /* Example standardization */
  .text-gray-400 → var(--color-text-secondary)
  .bg-background-logged-in → var(--color-bg-primary)
  ```

### Metadata & SEO

- [ ] **Update Page Metadata Dynamically**
  **Files:**
  - `app/layout.tsx:35-38` - Update root metadata
  - `app/lists/[id]/page.tsx` - Add dynamic metadata for list pages
  - `app/content/page.tsx` - Add dynamic metadata for content pages
  **Action:**

  ```typescript
  // app/lists/[id]/page.tsx
  export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const list = await fetchList(params.id);
    return {
      title: `${list.name} | DENN`,
      description: list.description || `View ${list.name} on DENN`,
    };
  }
  ```

- [ ] **Update Root Layout Metadata**
  **File:** `app/layout.tsx`
  **Replace:**

  ```typescript
  export const metadata: Metadata = {
    title: "DENN - Track Your Media Journey",
    description: "Track, rate, and organize your favorite movies, TV shows, games, music, and books all in one place.",
  };
  ```

### Responsive Design

- [ ] **Mobile Responsiveness Audit**
  **Pages to test:**
  - Homepage
  - Search page
  - List detail page
  - Content detail page
  - All modals
  **Breakpoints:** 375px, 768px, 1024px, 1440px
  **Action:** Test all pages on each breakpoint, fix layout issues

- [ ] **Test on Real Devices**
  **Devices:**
  - iPhone (Safari)
  - Android (Chrome)
  - iPad (Safari)
  - Desktop (Chrome, Firefox, Safari)
  **Focus:** Touch interactions, gestures, hover states

### Accessibility (a11y)

- [ ] **Add Keyboard Navigation to Modals**
  **Files:** All modal components
  **Requirements:**
  - ESC to close
  - Tab to cycle through focusable elements
  - Enter/Space to activate buttons
  - Focus trap (can't tab outside modal)

- [ ] **Add Keyboard Navigation to Carousels**
  **Files:** All carousel/gallery components
  **Requirements:**
  - Arrow keys to navigate
  - Enter to select
  - Focus indicators

- [ ] **Add ARIA Live Regions**
  **Use cases:**
  - Loading states ("Loading content...")
  - Success messages ("Added to list")
  - Error messages ("Failed to save")
  **Action:**

  ```typescript
  <div role="status" aria-live="polite" aria-atomic="true">
    {isLoading && "Loading..."}
  </div>
  ```

- [ ] **Add Missing onKeyDown Handlers**
  **File:** `app/_components/pages/LandingPage/components/DomeGallery/index.tsx`
  **Issue:** Image tiles have `role="button"` and `tabIndex={0}` but no keyboard handler
  **Action:**

  ```typescript
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleImageClick(it);
    }
  }}
  ```

### Code Organization

- [ ] **Move All Components to Named Exports**
  **Action:** Ensure all components use named exports (except Next.js framework files)
  **Why:** Better refactoring, tree-shaking, and IDE support

- [ ] **Audit Single-File Folders**
  **Action:** If a folder contains only `index.tsx`, move to single file
  **Example:**

  ```
  ❌ app/_components/cards/ContentCard/index.tsx (only file)
  ✅ app/_components/cards/ContentCard.tsx
  ```

- [ ] **Extract Helper Functions to End of File**
  **Action:** Ensure all helper functions are at the bottom of each file, after main export

### Testing (Future)

- [ ] **Set Up Testing Framework**
  **Tools:**
  - Vitest or Jest for unit tests
  - React Testing Library for component tests
  - Playwright for E2E tests
  **Priority:** Start with utility functions, then hooks, then components

- [ ] **Write Tests for Critical Paths**
  **Priority test coverage:**
  - Auth flow (login, register, logout, token refresh)
  - List CRUD operations
  - Content search
  - Add to list functionality
  - Rating submission

---

## 🎯 FUTURE FEATURES

### User Enhancements

- [ ] **User Profile Page**
  **Endpoint:** `/profile` or `/users/{username}`
  **Features:**
  - Edit profile (username, email, avatar)
  - View public lists
  - View rating history
  - User statistics (total items rated, lists created, etc.)

- [ ] **Google SSO (Single Sign-On)**
  **Action:** Integrate Google OAuth for easier registration
  **Backend:** Add OAuth endpoints
  **Frontend:** Add "Sign in with Google" button

### Collaborative Features

- [ ] **List Invitations System**
  **Features:**
  - Send invitation to user via email or username
  - Invitation acceptance flow
  - Notification system for invites
  **Backend:** Create invitations table, API endpoints
  **Frontend:** Invitation modal, notification badge

- [ ] **Public Lists & Private Ratings**
  **Feature:** Allow users to make lists public while keeping ratings private
  **Backend:** Add `is_public` flag to lists, `is_private` flag to ratings
  **Frontend:** Toggle in list settings

### Gamification

- [ ] **11th Star Feature (Premium/Bonus Rating)**
  **Concept:** Users can give ONE item per content type an 11th star (beyond 10/10)
  **Rules:**
  - Max 1 per content type (1 movie, 1 TV show, 1 game, etc.)
  - Removing 11th star from one item allows giving it to another
  **Backend:** Add `has_bonus_star` flag to ratings, validation logic
  **Frontend:** Special UI for 11-star rating, badge on item cards

### Advanced Features

- [ ] **Random Item Picker (Roulette)**
  **Feature:** "What should I watch/play/read?" button
  **Action:** Get random PENDING item from list with slot machine animation
  **Animation:** Items highlight rapidly, slow down, land on one
  **UI:** Big "Spin Again" button

  ```typescript
  const pickRandomItem = async () => {
    const response = await api.get(
      `/lists/${listId}/items/random/?count=1&status=PENDING`
    );
    animateRoulette(response.item);
  };
  ```

- [ ] **Smart Recommendations**
  **Feature:** "Based on your ratings, you might like..."
  **Backend:** Simple algorithm based on:
  - Items with similar genres/tags
  - Items rated highly by users with similar taste
  **Frontend:** Recommendations section on homepage

- [ ] **Export Lists**
  **Formats:** CSV, JSON, Markdown
  **Use case:** Backup, share on social media
  **Action:** Create export modal with format selection

- [ ] **Import Lists**
  **Formats:** CSV, JSON, Letterboxd import, IMDb import
  **Action:** Parse external format, map to DENN content items

- [ ] **Advanced Filters**
  **Features:**
  - Filter by release year range
  - Filter by rating range
  - Filter by content type
  - Filter by platform (where available)
  **UI:** Collapsible filter sidebar

- [ ] **Statistics Dashboard**
  **Metrics:**
  - Total items tracked
  - Items completed by month/year
  - Average rating by content type
  - Most-watched genres
  - Time spent (estimated based on runtime)
  **Charts:** Use Chart.js or Recharts

---

## 🔍 AUDIT FINDINGS - Technical Debt

> **Note:** These are additional findings from comprehensive codebase audit.
> Not all are blockers for MVP, but should be addressed before open-source release.

### Architecture Improvements

- [ ] **Replace Zustand Data Fetching with React Query/SWR**
  **Issue:** Stores do more than state management - they call API endpoints
  **Files:**
  - `app/_stores/lists-store.ts:57-343` - Mixing API calls with state
  - `app/_stores/auth-store.ts:54-139` - Auth logic should be in hook
  **Better pattern:**
  - Use SWR/React Query for data fetching (automatic caching, refetch, deduplication)
  - Use Zustand only for UI state (modals, preferences, etc.)

  ```typescript
  // Instead of:
  const { lists, fetchLists } = useListsStore();

  // Use:
  const { data: lists, isLoading, mutate } = useSWR('/api/lists/', fetcher);
  ```

- [ ] **Create Context for List Detail Page**
  **File:** `app/_components/pages/ListDetailPage/index.tsx`
  **Issue:** Passing 15+ props to child components
  **Action:** Create `ListContext` to avoid props drilling

  ```typescript
  const ListContext = createContext<ListContextValue | null>(null);

  export function ListDetailPage({ listId }: Props) {
    const value = {
      list,
      items,
      currentUser,
      handleAction,
      // ... all shared data
    };

    return (
      <ListContext.Provider value={value}>
        <ListHeader /> {/* No props needed */}
        <ListContent />
      </ListContext.Provider>
    );
  }
  ```

### Accessibility Improvements

- [ ] **Add Focus Management to Modals**
  **Action:** When modal opens, focus first interactive element
  **Action:** When modal closes, return focus to trigger element

- [ ] **Add Skip to Main Content Link**
  **File:** `app/layout.tsx` or `Navbar.tsx`
  **Action:** Add invisible link that appears on Tab focus

  ```typescript
  <a href="#main-content" className="sr-only focus:not-sr-only">
    Skip to main content
  </a>
  ```

- [ ] **Test with Screen Reader**
  **Tools:** NVDA (Windows), VoiceOver (Mac), JAWS
  **Action:** Navigate entire app with screen reader, fix issues

### Performance - Advanced

- [ ] **Implement Virtual Scrolling for Large Lists**
  **Use case:** Lists with 500+ items
  **Library:** `react-window` or `@tanstack/react-virtual`
  **Action:** Only render visible items + buffer

- [ ] **Add Service Worker for Offline Support**
  **Use case:** PWA functionality
  **Action:** Cache API responses, serve stale data when offline

- [ ] **Lazy Load Route Components**
  **Action:** Use Next.js dynamic imports for large components

  ```typescript
  const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
    loading: () => <LoadingSkeleton />,
  });
  ```

### Security - Additional

- [ ] **Implement Rate Limiting on Frontend**
  **Action:** Prevent spam clicking "Add to list", "Submit rating", etc.
  **Solution:** Debounce or disable button after click until response

- [ ] **Add Content Security Policy (CSP)**
  **File:** `next.config.js`
  **Action:** Add CSP headers to prevent XSS

  ```javascript
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: "default-src 'self'; script-src 'self' 'unsafe-inline';",
        },
      ],
    },
  ],
  ```

- [ ] **Audit Dependencies for Vulnerabilities**
  **Action:** Run `npm audit` and fix all high/critical vulnerabilities
  **Action:** Set up Dependabot or Renovate for automated dependency updates

### Documentation

- [ ] **Create CONTRIBUTING.md**
  **Content:**
  - How to set up dev environment
  - Coding standards (link to GUIDELINES.md)
  - How to submit issues
  - How to create pull requests
  - Code of conduct

- [ ] **Create API Documentation**
  **Tool:** Swagger/OpenAPI or Postman collection
  **Action:** Document all backend endpoints used by frontend

- [ ] **Add JSDoc Comments to Complex Functions**
  **Action:** Add JSDoc to utility functions, hooks, and complex components
  **Example:**

  ```typescript
  /**
   * Groups list items by specified criteria
   * @param items - Array of list items to group
   * @param groupBy - Grouping criteria (status, content_type, etc.)
   * @returns Object with grouped items
   */
  function groupItems(items: ListItem[], groupBy: GroupBy) { ... }
  ```

### Monitoring & Analytics (Production)

- [ ] **Set Up Error Tracking**
  **Tool:** Sentry, LogRocket, or Rollbar
  **Action:** Replace all console.error with proper error tracking

- [ ] **Set Up Analytics**
  **Tool:** Plausible, PostHog, or Google Analytics
  **Action:** Track key user actions:
  - Page views
  - List creation
  - Item additions
  - Ratings submitted
  - Search queries

- [ ] **Set Up Performance Monitoring**
  **Tool:** Vercel Analytics, Lighthouse CI
  **Metrics:** Core Web Vitals (LCP, FID, CLS)

---

## 📊 Summary

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| 🚨 Security | 9 | 0 | 0 | 0 | **9** |
| 🔴 Code Quality | 0 | 18 | 0 | 0 | **18** |
| 🟡 Backend Deps | 0 | 0 | 13 | 0 | **13** |
| 🟢 Frontend UX | 0 | 0 | 25 | 0 | **25** |
| 🔵 Organization | 0 | 0 | 0 | 12 | **12** |
| 🎯 Future Features | 0 | 0 | 0 | 13 | **13** |
| 🔍 Technical Debt | 0 | 0 | 14 | 0 | **14** |
| **TOTAL** | **9** | **18** | **52** | **25** | **104** |

---

## 🏁 Pre-Open Source Checklist

**Must complete before going open source:**

- [ ] All 🚨 CRITICAL items fixed
- [ ] All 🔴 HIGH PRIORITY items fixed or documented as known issues
- [ ] Security audit completed (manual + automated)
- [ ] Dependency audit completed (npm audit fix)
- [ ] CONTRIBUTING.md created
- [ ] LICENSE file added
- [ ] README.md updated with setup instructions
- [ ] Remove any hardcoded secrets/credentials
- [ ] Environment variables documented
- [ ] Test on multiple browsers/devices
- [ ] Code review by at least 2 developers
- [ ] Performance audit (Lighthouse score >90)

---

**Last Updated:** 2025-11-15
**Maintained by:** DENN Development Team
**Next Review:** After completing CRITICAL items
