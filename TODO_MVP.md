# TODO - MVP (Friends & Family Release)

> **Last Updated:** 2025-11-15
> **Target:** Friends & Family Launch
> **Focus:** Features, bugfixes, and UX improvements ONLY
> **Post-MVP:** See TODO.md for architectural improvements and optimizations

---

## 📋 MVP Release Strategy

**Phase 1:** Complete features and fix bugs → Launch to friends & family
**Phase 2:** Gather feedback, iterate
**Phase 3:** Apply architectural improvements (ARCHITECTURE_RECOMMENDATIONS.md)
**Phase 4:** Security hardening (SECURITY_AUDIT.md)
**Phase 5:** Public/Open Source release

---

## 🎯 BLOCKER BUGS (Must Fix Before MVP)

### Critical Bugs That Break User Experience

- [ ] **Fix Rating Modal in Lists - Allow Half Stars**
  **File:** `app/_components/common/modals/RateItemModal.tsx`
  **Issue:** Only allows full star ratings, should allow 0.5 increments like ContentDetailPage
  **Action:** Reuse the rating component from ContentDetailPage that supports half stars
  **Priority:** 🔴 BLOCKER

- [ ] **Fix "Rate this item" Prompt - Only Show if Not Rated**
  **File:** `app/_components/pages/ContentDetailPage/components/AboutSection.tsx`
  **Issue:** "Rate this item" appears even after user has rated
  **Action:** Only show prompt if `userRating` is null/undefined
  **Priority:** 🔴 BLOCKER

- [ ] **Fix AddToListModal Overflow on Small Screens**
  **File:** `app/_components/common/modals/AddToListModal/index.tsx`
  **Issue:** "Add TV Show" / "Add Individual Seasons" buttons overflow modal on mobile
  **Action:** Make buttons stack vertically on small screens (CSS fix)
  **Priority:** 🔴 HIGH

- [ ] **Fix List Grouping Pagination Buttons**
  **File:** `app/_components/pages/ListDetailPage/components/ListSidebar.tsx`
  **Issue:** Pagination button styling broken in grouped view
  **Action:** Fix CSS for pagination controls in grouped mode
  **Priority:** 🟡 MEDIUM

- [ ] **Fix List Grouping Titles**
  **File:** Grouped list view components
  **Issue:** Group titles not displaying correctly
  **Action:** Review grouping logic and title rendering
  **Priority:** 🟡 MEDIUM

- [ ] **Fix TV Show Addition Check**
  **Issue:** When selecting "Add TV Show" option, doesn't check if show is already in list
  **File:** `app/_components/common/modals/AddToListModal/index.tsx`
  **Action:** Before adding TV show, check if it exists in the list
  **Priority:** 🟡 MEDIUM

---

## 🟢 FRONTEND FEATURES & UX (MVP Must-Haves)

### Search Page

- [ ] **Cancel Debounced Requests**
  **File:** `app/_components/pages/SearchPage/index.tsx`
  **Issue:** Previous search requests not cancelled when user types
  **Action:** Use AbortController to cancel in-flight requests

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
  **Issue:** When search returns 0 results for a content type, entire section disappears
  **Action:** Show "No movies found" message instead of hiding section
  **Priority:** 🟢 LOW

### Homepage

- [ ] **Make Card Previews Expandable on Hover**
  **File:** `app/_components/cards/ListCard.tsx`
  **Issue:** Homepage list cards don't expand on hover like content cards do
  **Action:** Add same hover effect as content cards
  **Priority:** 🟢 NICE TO HAVE

### Add to List Modal (UX Improvements)

- [ ] **Redesign Add to List Modal**
  **File:** `app/_components/common/modals/AddToListModal/index.tsx`
  **Changes:**
  - Remove "Cancel" button (redundant with X close button)
  - Change to checkbox behavior: click list = toggle add/remove (no separate "Add" button)
  - Remove "Your lists" header text
  - Show more metadata per list (item count, last updated, list type icon)
  - Don't close modal when adding to a list (allow multiple selections)
  - Auto-close after 2s of inactivity OR add "Done" button
  **Priority:** 🟡 MEDIUM

- [ ] **Auto-generate Random List Names**
  **File:** `app/_components/common/modals/CreateListModal.tsx`
  **Action:** When creating list, suggest random creative names if user leaves name blank
  **Example:**

  ```typescript
  const ADJECTIVES = ["Epic", "Cozy", "Wild", "Mystical", "Legendary", "Hidden", "Stellar", "Cosmic"];
  const NOUNS = ["Adventures", "Journeys", "Discoveries", "Treasures", "Memories", "Quests", "Stories"];
  const randomName = `${random(ADJECTIVES)} ${random(NOUNS)}`;
  ```

  **Priority:** 🟢 NICE TO HAVE

### List Detail Page

- [ ] **Fix List Grouping UI - Multi-level with Checkboxes**
  **File:** `app/_components/pages/ListDetailPage/components/ListSidebar.tsx`
  **Current Issues:**
  - Uses select dropdowns instead of checkboxes
  - Can't do multi-level grouping easily
  - Remove "theme" from preferences (not used)
  **Action:**
  - Replace select dropdowns with checkboxes
  - Allow N-level grouping (e.g., Status → Content Type → Release Year)
  - User checks multiple grouping criteria
  **Priority:** 🟡 MEDIUM

- [ ] **Remove "Toggle Animations" Setting**
  **File:** `app/_stores/settings-store.ts`
  **Action:** Remove entire settings store if this is the only setting
  **Reason:** Animation toggle not needed for MVP, complicates code
  **Priority:** 🟢 LOW

### Content Detail Page

- [ ] **Consolidate Rating API Calls**
  **File:** `app/_components/pages/ContentDetailPage/components/RatingsSection.tsx:40-44`
  **Issue:** Makes 2 separate API calls for ratings
  **Action:** Wait for backend fix, or optimize to single call if possible
  **Priority:** 🟢 LOW (backend-dependent)

- [ ] **Fix "Where to Watch" Platform Alignment**
  **File:** Component showing streaming platforms
  **Issue:** Platform logos are misaligned
  **Action:** Use CSS Grid with fixed width per item or proper flexbox spacing
  **Priority:** 🟡 MEDIUM

- [ ] **Map "Where to Play" Platform Images**
  **Action:** Create local mapping of platform IDs → logo images in frontend
  **Reason:** Avoid depending on external CDN for platform logos
  **Priority:** 🟢 LOW

- [ ] **Add Gallery Modal (Image Expansion)**
  **File:** `app/_components/pages/ContentDetailPage/components/GallerySection.tsx`
  **Feature:** Click on gallery image → opens full-screen modal
  **Components needed:**
  - `ImageModal.tsx` with full-screen overlay
  - Image zoom/pan controls
  - Arrow navigation for gallery
  - ESC key to close
  **Priority:** 🟢 NICE TO HAVE

### Card Hover Effects

- [ ] **Show Metadata on Hover (Not Description)**
  **File:** `app/_components/common/cards/Card/index.tsx`
  **Action:** On hover, show metadata (year, rating, runtime) instead of long description
  **Priority:** 🟢 LOW

- [ ] **Change "Add to List" Button Icon**
  **Action:** Make button more visually distinct, add cursor pointer
  **Priority:** 🟢 LOW

- [ ] **Show Full Title on Hover (Don't Truncate)**
  **Action:** Expand card or show tooltip with full title if truncated
  **Priority:** 🟢 LOW

### Loading States

- [ ] **Add Skeleton Placeholders for List Items**
  **Files:**
  - `app/_components/pages/ListDetailPage/components/ListView/FlatListView.tsx`
  - `app/_components/pages/ListDetailPage/components/ListView/GroupedListView.tsx`
  **Action:** Show loading skeletons like homepage while items are fetching
  **Priority:** 🟡 MEDIUM

- [ ] **Add Skeleton Placeholders for Content Detail**
  **File:** `app/_components/pages/ContentDetailPage/index.tsx`
  **Action:** Replace generic spinner with structured skeleton matching page layout
  **Priority:** 🟡 MEDIUM

---

## 🟡 BACKEND DEPENDENCIES (Coordinate with Backend Team)

### High Priority Backend Fixes

- [ ] **Backend: Include OWNER in MEMBERS list**
  **Issue:** Owner is not included in list.members, causing bugs
  **Action:** Backend should include owner in members array for all lists
  **Impact:** Fixes multiple frontend bugs related to permissions
  **Priority:** 🔴 HIGH

- [ ] **Backend: Filter Invalid TV Seasons**
  **Endpoint:** `/api/content/{id}/`
  **Issue:** Returns seasons with 0 episodes or future release dates
  **Action:** Backend should NOT return:
  - Seasons with 0 episodes
  - Seasons with only 1 episode without release date
  - Seasons with future release dates
  **Priority:** 🔴 HIGH

- [ ] **Backend: Calculate `list_rating` and `member_rating_count`**
  **Endpoint:** `/api/lists/{id}/items/`
  **Action:** Backend should calculate and return:
  - `list_rating` (average of all member ratings)
  - `member_rating_count` (count of members who rated)
  **Reason:** Avoid N+1 queries on frontend
  **Priority:** 🟡 MEDIUM

- [ ] **Backend: Return Owner's Ratings in `member_ratings`**
  **Issue:** Owner's ratings not included in member_ratings array
  **Action:** Include owner's rating in member_ratings for consistency
  **Priority:** 🟡 MEDIUM

### Medium Priority Backend Improvements

- [ ] **Backend: Remove `notes` from List Items**
  **Action:** Deprecate `notes` field from list_items
  **Reason:** Not used in current UI design
  **Priority:** 🟢 LOW

- [ ] **Backend: Filter Future Release Dates**
  **Endpoints:** All content endpoints
  **Action:** Do NOT return content items with:
  - `release_date` > (today + 1 day) [1-day margin for timezone issues]
  - `release_date` = null
  **Priority:** 🟢 LOW

- [ ] **Backend: Create Multi-Search Endpoint**
  **Endpoint:** `POST /api/content/multi-search/`
  **Issue:** Frontend makes 5 separate API calls for each search
  **Action:** Create single endpoint that searches all content types
  **Priority:** 🟡 MEDIUM

- [ ] **Backend: Check Item in User's Lists Endpoint**
  **Endpoint:** `GET /api/lists/check-item/?content_item_id={id}`
  **Purpose:** Check if a content item is in ANY of the user's lists
  **Priority:** 🟢 LOW

- [ ] **Backend: Validate Duplicate Items**
  **Action:** Return 400 error if item already exists in list
  **Priority:** 🟢 LOW

- [ ] **Backend: Random List Items Endpoint**
  **Endpoint:** `GET /api/lists/{id}/items/random/?count={n}&status=PENDING`
  **Purpose:** Get N random items from a list
  **Use Case:** "Pick random item from my watchlist" feature
  **Priority:** 🟢 FUTURE

- [ ] **Backend: Fix Homepage List Preview (Random Items)**
  **Endpoint:** `GET /api/lists/?items_size={n}`
  **Issue:** Returns first N items instead of random
  **Action:** Randomize the items returned for preview
  **Priority:** 🟢 LOW

- [ ] **Backend: Fix Homepage List Count**
  **Endpoint:** `GET /api/lists/?items_size={n}`
  **Issue:** Returns `item_count` = items_size instead of actual total
  **Action:** Return actual total count regardless of items_size
  **Priority:** 🟡 MEDIUM

---

## 🔵 FRONTEND POLISH (Pre-Launch)

### Styling & Consistency

- [ ] **Standardize Font Usage**
  **Action:** Use `font-sans` for all body text
  **Keep current fonts ONLY for:**
  - Page titles (h1)
  - Section headers (h2, h3)
  - Button labels
  **Priority:** 🟡 MEDIUM

- [ ] **Standardize Color Palette**
  **File:** `app/globals.css`
  **Action:**
  - Audit all color usages
  - Replace hardcoded colors with CSS variables
  - Document color system
  **Priority:** 🟢 LOW

### SEO & Metadata

- [ ] **Update Page Metadata Dynamically**
  **Files:**
  - `app/layout.tsx` - Update root metadata
  - `app/lists/[id]/page.tsx` - Add dynamic metadata
  - `app/content/page.tsx` - Add dynamic metadata
  **Action:**

  ```typescript
  export const metadata: Metadata = {
    title: "DENN - Track Your Media Journey",
    description: "Track, rate, and organize your favorite movies, TV shows, games, music, and books.",
  };
  ```

  **Priority:** 🟡 MEDIUM

- [ ] **Change Page Title Dynamically**
  **Action:** Update document title based on current page
  **Priority:** 🟢 LOW

### Responsive Design

- [ ] **Mobile Responsiveness Audit**
  **Pages to test:**
  - Homepage
  - Search page
  - List detail page
  - Content detail page
  - All modals
  **Breakpoints:** 375px, 768px, 1024px, 1440px
  **Priority:** 🔴 HIGH (before friends & family launch)

- [ ] **Test on Real Devices**
  **Devices:**
  - iPhone (Safari)
  - Android (Chrome)
  - iPad (Safari)
  - Desktop (Chrome, Firefox)
  **Priority:** 🔴 HIGH (before launch)

---

## 🚀 SERVER-SIDE RENDERING (SSR)

### Landing Page SSR Implementation

**Goal:** Make LandingPage fast-loading and SEO-optimized with Server-Side Rendering

**Current Issue:** LandingPage uses client-side API call to `/api/cards` in `Background.tsx`

**Solution:**

1. **Convert to Server Component**
   ```typescript
   // app/page.tsx (Landing Page)
   import { LandingPageContent } from './_components/pages/LandingPage';

   async function getBackgroundImages() {
     // Fetch server-side
     const res = await fetch(`${process.env.API_URL}/api/cards`, {
       cache: 'force-cache', // or 'no-store' for always fresh
       next: { revalidate: 3600 } // Revalidate every hour
     });
     return res.json();
   }

   export default async function HomePage() {
     const images = await getBackgroundImages();

     return <LandingPageContent images={images} />;
   }
   ```

2. **Split Client and Server Components**
   ```
   app/_components/pages/LandingPage/
   ├── index.tsx                    # Server Component (fetches data)
   ├── LandingPageContent.tsx      # Client Component ('use client')
   ├── components/
   │   ├── Background.tsx          # Now receives images as props
   │   ├── DomeGallery/            # Client component (animations)
   │   └── ...
   ```

3. **Benefits:**
   - ✅ Faster initial page load (no client-side fetch)
   - ✅ SEO optimized (crawlers see full content)
   - ✅ Better Core Web Vitals (LCP, FCP)
   - ✅ Images cached server-side

**Tasks:**
- [ ] **Convert LandingPage to Server Component**
  **File:** `app/page.tsx`
  **Action:** Fetch `/api/cards` server-side, pass to client components
  **Priority:** 🟡 MEDIUM

- [ ] **Split Background.tsx to receive props**
  **File:** `app/_components/pages/LandingPage/components/Background.tsx`
  **Action:** Remove useEffect fetch, accept `images` as prop
  **Priority:** 🟡 MEDIUM

- [ ] **Add ISR (Incremental Static Regeneration)**
  **Action:** Configure revalidation time (e.g., 1 hour)
  **Benefit:** Static-like performance with fresh data
  **Priority:** 🟢 LOW

- [ ] **Optimize DomeGallery Images for SSR**
  **File:** `app/_components/pages/LandingPage/components/DomeGallery/index.tsx`
  **Action:** Ensure images are properly sized and optimized
  **Priority:** 🟢 LOW

---

## 📋 MVP Launch Checklist

**Before friends & family launch:**

### Must Have ✅
- [ ] All 🔴 BLOCKER bugs fixed
- [ ] Mobile responsive (test on iPhone, Android)
- [ ] No console errors in production build
- [ ] All critical user flows work:
  - [ ] Register/Login
  - [ ] Create list
  - [ ] Add items to list
  - [ ] Rate content
  - [ ] Search content
  - [ ] View content details

### Should Have 🟡
- [ ] Homepage loads fast (<3s on 3G)
- [ ] All modals work on mobile
- [ ] Loading states for all async operations
- [ ] Error messages are user-friendly
- [ ] List grouping works properly

### Nice to Have 🟢
- [ ] SSR for landing page
- [ ] Skeleton loaders
- [ ] Gallery modal
- [ ] Random list names
- [ ] Metadata optimization

---

## 🎯 Post-MVP (After Friends & Family Feedback)

**Phase 1:** Gather user feedback (2-4 weeks)
**Phase 2:** Iterate on critical UX issues
**Phase 3:** Apply optimizations from ARCHITECTURE_RECOMMENDATIONS.md:
- Migrate to SWR
- Refactor large components
- Add React.memo
- Performance optimization

**Phase 4:** Security hardening from SECURITY_AUDIT.md:
- Fix all 9 critical vulnerabilities
- Remove console logs
- Add error boundaries
- CSRF protection

**Phase 5:** Prepare for public/open source release

---

## 📊 Progress Tracking

| Category | Total | Completed | Remaining |
|----------|-------|-----------|-----------|
| 🔴 Blocker Bugs | 7 | 0 | 7 |
| 🟢 Features & UX | 18 | 0 | 18 |
| 🟡 Backend Deps | 12 | 0 | 12 |
| 🔵 Polish | 7 | 0 | 7 |
| 🚀 SSR | 4 | 0 | 4 |
| **TOTAL** | **48** | **0** | **48** |

---

**MVP Timeline Estimate:**
- **Sprint 1 (Week 1-2):** Fix blocker bugs + high priority backend fixes
- **Sprint 2 (Week 3-4):** Features & UX improvements
- **Sprint 3 (Week 5-6):** Polish + responsive design + SSR
- **Sprint 4 (Week 7):** Testing & bug fixes
- **Week 8:** Friends & Family Launch 🚀

---

**Last Updated:** 2025-11-15
**Next Review:** After Sprint 1
**Team:** DENN Development Team
