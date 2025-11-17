# Sprint 2.5 - Frontend Tasks (Week 5-6)

> **Sprint Goal:** UX Polish, Responsive Design, and Missing Features from Legacy Requirements
> **Duration:** 2 weeks
> **Team:** Frontend
> **Prerequisites:** Sprint 1 ✅ DONE, Sprint 2 Backend tasks complete

---

## ⚠️ PREREQUISITES

**Before starting this sprint, ensure:**
- [ ] Sprint 1 Frontend - ALL TASKS ✅ DEPLOYED
- [ ] Sprint 2 Backend - BE-201, BE-202, BE-203 ✅ DEPLOYED
- [ ] Sprint 2 Frontend - FE-201, FE-202, FE-203 ✅ DEPLOYED

---

## 🔴 CRITICAL Tasks (Must Complete for MVP)

### FE-2.5-01: Responsive Design Implementation
**Priority:** 🔴 CRITICAL (MVP BLOCKER)
**Estimate:** 5 days
**Owner:** _Assign_
**Dependencies:** None

**Current Issue:**
Application not fully responsive on mobile/tablet devices. Many components break on small screens.

**Target Devices:**
- Mobile: 375px - 767px (iPhone SE, iPhone 14 Pro, Android)
- Tablet: 768px - 1023px (iPad, Android tablets)
- Desktop: 1024px+ (Desktop browsers)

**Components to Fix:**

1. **Navbar** (`app/_components/layout/Navbar.tsx`)
   - [ ] Mobile: Hamburger menu
   - [ ] Hide less important links
   - [ ] Logo size adjustment

2. **Homepage** (`app/_components/pages/HomePage/index.tsx`)
   - [ ] Hero section stacks vertically
   - [ ] List carousel touch-friendly
   - [ ] Cards resize appropriately

3. **ListDetailPage** (`app/_components/pages/ListDetailPage/index.tsx`)
   - [ ] Sidebar becomes bottom sheet on mobile
   - [ ] List items stack vertically
   - [ ] Actions accessible on mobile

4. **ContentDetailPage** (`app/_components/pages/ContentDetailPage/index.tsx`)
   - [ ] Image gallery scrolls horizontally
   - [ ] Metadata stacks vertically
   - [ ] Watch providers grid responsive

5. **SearchPage** (`app/_components/pages/SearchPage/index.tsx`)
   - [ ] Search bar full width on mobile
   - [ ] Results grid: 1 col mobile, 2 col tablet, 3+ col desktop

6. **Modals** (All modal components)
   - [ ] Full screen on mobile
   - [ ] Appropriate padding
   - [ ] Buttons stack on small screens

**Responsive Breakpoint Strategy:**
```typescript
// Use Tailwind responsive prefixes
<div className="
  px-4          // Mobile: 16px padding
  md:px-6       // Tablet: 24px padding
  lg:px-8       // Desktop: 32px padding

  grid
  grid-cols-1   // Mobile: 1 column
  md:grid-cols-2  // Tablet: 2 columns
  lg:grid-cols-3  // Desktop: 3 columns
  xl:grid-cols-4  // Large desktop: 4 columns
">
```

**Testing Checklist:**
- [ ] Test on iPhone SE (375px)
- [ ] Test on iPhone 14 Pro (393px)
- [ ] Test on iPad (768px)
- [ ] Test on Android phone
- [ ] Test on Android tablet
- [ ] Test on Desktop Chrome
- [ ] Test on Desktop Safari
- [ ] Test landscape mode on phones/tablets

**Acceptance Criteria:**
- [ ] All pages render correctly on mobile (375px)
- [ ] All interactive elements are touch-friendly (min 44px)
- [ ] No horizontal scrolling on any device
- [ ] Text is readable without zooming
- [ ] Images scale appropriately
- [ ] Modals don't overflow viewport
- [ ] Navigation works on all devices
- [ ] Forms are usable on mobile keyboards

---

### FE-2.5-02: Standardize Colors
**Priority:** 🟡 HIGH
**Estimate:** 2 days
**Owner:** _Assign_
**Dependencies:** None

**Current Issue:**
Inconsistent color usage across components. Hardcoded colors make theming difficult.

**Audit Results:**
- 47 hardcoded color values found
- Inconsistent naming (gray-700 vs gray-800)
- Missing semantic color tokens

**Action Plan:**

**Step 1:** Create centralized color system in `globals.css`
```css
/* app/globals.css */
:root {
  /* Base colors */
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
  --color-secondary: #8b5cf6;

  /* Background colors */
  --color-bg-base: #0a0a0a;
  --color-bg-elevated: #1a1a1a;
  --color-bg-card: #262626;

  /* Text colors */
  --color-text-primary: #ffffff;
  --color-text-secondary: #a3a3a3;
  --color-text-muted: #737373;

  /* Border colors */
  --color-border-default: rgba(255, 255, 255, 0.1);
  --color-border-hover: rgba(255, 255, 255, 0.2);

  /* Status colors */
  --color-success: #22c55e;
  --color-error: #ef4444;
  --color-warning: #f59e0b;
  --color-info: #3b82f6;
}
```

**Step 2:** Update Tailwind config
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        'primary-hover': 'var(--color-primary-hover)',
        secondary: 'var(--color-secondary)',
        // ... etc
      }
    }
  }
}
```

**Step 3:** Replace hardcoded colors
```typescript
// Before:
<div className="bg-[#1a1a1a] border-[#333]">

// After:
<div className="bg-elevated border-default">
```

**Files to Update:**
- [ ] `app/_components/layout/Navbar.tsx`
- [ ] `app/_components/cards/ContentCard.tsx`
- [ ] `app/_components/cards/ListCard.tsx`
- [ ] `app/_components/common/Modal.tsx`
- [ ] `app/_components/pages/HomePage/index.tsx`
- [ ] `app/_components/pages/ListDetailPage/index.tsx`
- [ ] `app/_components/pages/ContentDetailPage/index.tsx`
- [ ] All other components with hardcoded colors

**Acceptance Criteria:**
- [ ] No hardcoded color hex values in components
- [ ] All colors use CSS variables
- [ ] Colors are semantically named
- [ ] Dark mode still works correctly
- [ ] Visual consistency across all pages
- [ ] Easy to update theme (change CSS variables only)

---

## 🟡 HIGH PRIORITY Tasks

### FE-2.5-03: Content Detail - Consolidate Rating API Calls
**Priority:** 🟡 HIGH
**Estimate:** 1 day
**Owner:** _Assign_
**Dependencies:** Backend discussion needed

**Current Issue:**
Two API calls for ratings on ContentDetailPage:
```typescript
// Call 1: Get user's own rating
GET /api/content/ratings/?content_item_id=123&user_id=1&page_size=1

// Call 2: Get all ratings for display
GET /api/content/ratings/?content_item_id=123&page=1&page_size=10
```

**Proposed Solution:**

**Option A:** Backend returns user rating in content detail response
```typescript
// GET /api/content/123/
{
  "id": 123,
  "title": "The Matrix",
  "user_rating": 9.5,  // ← Include this
  "average_rating": 8.7,
  "ratings": [...],    // First page of ratings
  // ... rest of content data
}
```

**Option B:** Single ratings endpoint returns user rating + others
```typescript
// GET /api/content/ratings/?content_item_id=123&page=1&page_size=10&include_user=true
{
  "user_rating": {
    "rating": 9.5,
    "created_at": "..."
  },
  "results": [...],  // Other ratings
  "count": 47
}
```

**Recommendation:** Option A (cleaner, fewer API calls overall)

**Implementation:**
```typescript
// Before: Two hooks
const { userRating } = useUserRating(contentItemId);
const { ratings } = useContentRatings(contentItemId);

// After: One hook
const { contentData, userRating, ratings } = useContentData(contentItemId);
```

**Acceptance Criteria:**
- [ ] Only one API call for ratings
- [ ] User rating included in response
- [ ] Other ratings paginated as before
- [ ] Loading state simplified
- [ ] Error handling unchanged

**Files to Update:**
- `app/_components/pages/ContentDetailPage/hooks/useContentData.ts`
- `app/_components/pages/ContentDetailPage/index.tsx`

---

### FE-2.5-04: Homepage Navigation Performance
**Priority:** 🟡 HIGH
**Estimate:** 1 day
**Owner:** _Assign_
**Dependencies:** None

**Current Issue:**
Clicking on a list card has a noticeable delay before navigation. Investigation shows an API call is blocking navigation.

**Root Cause:**
```typescript
// Homepage.tsx
const handleListClick = async (listId: number) => {
  // ❌ This blocks navigation
  await fetchListDetails(listId);
  router.push(`/lists/${listId}`);
};
```

**Solution:**
```typescript
// ✅ Navigate immediately, fetch data on destination page
const handleListClick = (listId: number) => {
  router.push(`/lists/${listId}`);
  // ListDetailPage will fetch data on mount
};
```

**Additional Optimization:**
Prefetch list data on hover (for desktop):
```typescript
const handleListHover = (listId: number) => {
  // Prefetch in background
  router.prefetch(`/lists/${listId}`);

  // Optional: Warm cache
  if (typeof window !== 'undefined') {
    queryClient.prefetchQuery(['list', listId], () => fetchListDetails(listId));
  }
};

<ListCard
  onClick={() => handleListClick(listId)}
  onMouseEnter={() => handleListHover(listId)}  // Desktop only
/>
```

**Acceptance Criteria:**
- [ ] Navigation is instant (<100ms perceived delay)
- [ ] No blocking API calls before navigation
- [ ] Data still loads correctly on destination page
- [ ] Prefetching works on desktop hover
- [ ] Mobile performance not degraded

**Files to Update:**
- `app/_components/pages/HomePage/index.tsx`
- `app/_components/cards/ListCard.tsx`

---

### FE-2.5-05: TV Show - Pre-check if in List
**Priority:** 🟡 HIGH
**Estimate:** 1 day
**Owner:** _Assign_
**Dependencies:** BE-2.5-01 (Check item in lists endpoint)

**Current Issue:**
When user adds a TV show to a list, frontend doesn't check if it's already in the list before attempting add. User gets duplicate error after clicking.

**Solution:**
Use new backend endpoint to check before showing "Add" UI.

**New Endpoint (from BE-2.5-01):**
```typescript
GET /api/content/{content_item_id}/in-lists/?user_id={user_id}

Response:
{
  "in_lists": [
    { "id": 1, "name": "Watchlist", "added_at": "2024-01-15" },
    { "id": 5, "name": "Sci-Fi Collection", "added_at": "2024-02-20" }
  ],
  "count": 2
}
```

**Implementation:**
```typescript
// In AddToListModal for TV Shows
const { data: existingLists } = useQuery(
  ['item-in-lists', contentItemId, userId],
  () => api.get(`/api/content/${contentItemId}/in-lists/?user_id=${userId}`)
);

// Show UI differently
{lists.map(list => {
  const isInList = existingLists?.in_lists.some(l => l.id === list.id);

  return (
    <div key={list.id}>
      <Checkbox
        checked={isInList}
        disabled={isInList}  // Can't add again
        onChange={() => handleAddToList(list.id)}
      />
      {list.name}
      {isInList && (
        <span className="text-xs text-gray-400">
          Already added {formatDate(existingLists.in_lists.find(l => l.id === list.id).added_at)}
        </span>
      )}
    </div>
  );
})}
```

**Acceptance Criteria:**
- [ ] Checks if TV show already in lists before showing modal
- [ ] Shows "Already in X lists" indicator
- [ ] Disables checkbox for lists that already have the item
- [ ] Shows when item was added to each list
- [ ] Prevents duplicate add attempts
- [ ] Works for all content types (not just TV shows)

**Files to Update:**
- `app/_components/common/modals/AddToListModal/index.tsx`
- `app/_components/common/modals/AddToListModal/TVShowOptions.tsx`

---

### BE-2.5-01: Check Item in User Lists Endpoint
**Priority:** 🟡 HIGH
**Estimate:** 2 days
**Owner:** Backend Team
**Dependencies:** None

**See:** `docs/PHASE_1_MVP_SPRINT_2.5/BACKEND.md` for full specification

---

### BE-2.5-02: Request Retry Logic
**Priority:** 🟡 HIGH
**Estimate:** 2 days
**Owner:** Backend Team
**Dependencies:** None

**See:** `docs/PHASE_1_MVP_SPRINT_2.5/BACKEND.md` for full specification

---

### BE-2.5-03: Elevate Release Date Filtering
**Priority:** 🟡 HIGH (Upgraded from 🟢 MEDIUM)
**Estimate:** Already planned in BE-205 (Sprint 2)
**Owner:** Backend Team
**Dependencies:** None

**Action:** Move BE-205 from Sprint 2 to Sprint 2.5 and upgrade priority.

**See:** `docs/PHASE_1_MVP_SPRINT_2/BACKEND.md` line 320-386 for specification

---

## 🟢 MEDIUM PRIORITY Tasks

### FE-2.5-06: Dynamic Page Titles
**Priority:** 🟢 MEDIUM
**Estimate:** 1 day
**Owner:** _Assign_
**Dependencies:** None

**Current Issue:**
All pages have static title "DENN - Track Your Media Journey"

**Desired Behavior:**
```
Homepage: "DENN - Track Your Media Journey"
ListDetail: "My Watchlist - DENN"
ContentDetail: "The Matrix (1999) - DENN"
SearchPage: "Search: inception - DENN"
```

**Implementation (Next.js App Router):**
```typescript
// app/lists/[id]/page.tsx
import { Metadata } from 'next';

export async function generateMetadata({ params }): Promise<Metadata> {
  const list = await fetchList(params.id);

  return {
    title: `${list.name} - DENN`,
    description: list.description || `View ${list.name} on DENN`,
  };
}
```

**Client-side (for dynamic parts):**
```typescript
// app/_components/pages/ContentDetailPage/index.tsx
import { useEffect } from 'react';

useEffect(() => {
  if (contentData?.title) {
    document.title = `${contentData.title} - DENN`;
  }
}, [contentData]);
```

**Acceptance Criteria:**
- [ ] Page title updates based on content
- [ ] Browser tab shows correct title
- [ ] Works for all major pages
- [ ] Falls back to default title if data not loaded
- [ ] SEO metadata also updated

**Pages to Update:**
- [ ] `/lists/[id]` - Show list name
- [ ] `/content` - Show content title
- [ ] `/search` - Show search query
- [ ] `/profile` - Show username

---

### FE-2.5-07: Where to Play Icon Mapping
**Priority:** 🟢 MEDIUM
**Estimate:** 1 day
**Owner:** _Assign_
**Dependencies:** None

**Current Issue:**
"Where to Watch/Play" section shows platform names as text, no logos.

**Solution:**
Map platform names to icon components or URLs.

**Implementation:**
```typescript
// lib/utils/platformIcons.ts
export const PLATFORM_ICONS: Record<string, string> = {
  // Streaming
  'netflix': 'https://images.justwatch.com/icon/430997/s100/netflix.webp',
  'disney-plus': 'https://images.justwatch.com/icon/147638/s100/disney-plus.webp',
  'hbo-max': 'https://images.justwatch.com/icon/430996/s100/hbo-max.webp',
  'amazon-prime-video': 'https://images.justwatch.com/icon/52449861/s100/amazon-prime-video.webp',

  // Gaming
  'steam': '/icons/platforms/steam.svg',
  'playstation': '/icons/platforms/playstation.svg',
  'xbox': '/icons/platforms/xbox.svg',
  'nintendo-switch': '/icons/platforms/switch.svg',

  // Music
  'spotify': '/icons/platforms/spotify.svg',
  'apple-music': '/icons/platforms/apple-music.svg',
  'youtube-music': '/icons/platforms/youtube-music.svg',
};

export function getPlatformIcon(platformName: string): string | null {
  const normalized = platformName.toLowerCase().replace(/\s+/g, '-');
  return PLATFORM_ICONS[normalized] || null;
}
```

**Usage:**
```typescript
// ContentDetailPage
{platforms.map(platform => {
  const iconUrl = getPlatformIcon(platform.name);

  return (
    <div key={platform.id} className="flex items-center gap-2">
      {iconUrl ? (
        <Image src={iconUrl} alt={platform.name} width={24} height={24} />
      ) : (
        <span className="text-sm">{platform.name}</span>
      )}
    </div>
  );
})}
```

**Acceptance Criteria:**
- [ ] Platform logos display for known platforms
- [ ] Fallback to text for unknown platforms
- [ ] Icons are sized consistently (24x24px)
- [ ] Icons load quickly (optimized)
- [ ] Works for all content types (movies, TV, games, music)

**Files to Update:**
- `lib/utils/platformIcons.ts` (new file)
- `app/_components/pages/ContentDetailPage/components/WhereToWatch.tsx`

---

### FE-2.5-08: Homepage - Random Preview Items
**Priority:** 🟢 MEDIUM
**Estimate:** 0.5 days
**Owner:** _Assign_
**Dependencies:** BE-2.5-04 (Backend random items endpoint)

**Current Issue:**
Homepage list previews always show the first N items. User sees same items every time.

**Solution:**
Use backend's `random=true` parameter to get random sample.

**Implementation:**
```typescript
// Before:
const { lists } = useLists({ items_size: 6 });

// After:
const { lists } = useLists({ items_size: 6, random: true });
```

**Backend Support (from BE-2.5-04):**
```
GET /api/lists/?items_size=6&random=true
```

**Acceptance Criteria:**
- [ ] Different items shown on each page load/refresh
- [ ] Still shows correct number of items (items_size param)
- [ ] Performance not degraded
- [ ] Random seed different per request
- [ ] Works for all lists

**Files to Update:**
- `app/_components/pages/HomePage/index.tsx`

---

### BE-2.5-04: Homepage Random Items
**Priority:** 🟢 MEDIUM
**Estimate:** 1 day
**Owner:** Backend Team
**Dependencies:** None

**See:** `docs/PHASE_1_MVP_SPRINT_2.5/BACKEND.md` for full specification

---

## 🟢 LOW PRIORITY Tasks (Nice to Have)

### FE-2.5-09: Card Hover Improvements
**Priority:** 🟢 LOW
**Estimate:** 0.5 days
**Owner:** _Assign_
**Dependencies:** None

**Changes:**
1. Show full title on hover (remove truncation)
2. Add cursor pointer to "Add to List" button
3. Improve visual feedback

**Implementation:**
```typescript
// Before:
<h3 className="truncate">{title}</h3>
<button>Add to List</button>

// After:
<h3 className="group-hover:whitespace-normal group-hover:line-clamp-none truncate transition-all">
  {title}
</h3>
<button className="cursor-pointer hover:bg-primary/90">
  Add to List
</button>
```

**Acceptance Criteria:**
- [ ] Title expands on hover
- [ ] Button has pointer cursor
- [ ] Smooth transition
- [ ] Doesn't break card layout

---

### FE-2.5-10: Content Detail - Where to Watch Alignment
**Priority:** 🟢 LOW
**Estimate:** 0.5 days
**Owner:** _Assign_
**Dependencies:** None

**Current Issue:**
Platform logos are misaligned, inconsistent spacing.

**Solution:**
Use CSS Grid for consistent layout.

**Implementation:**
```typescript
<div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
  {platforms.map(platform => (
    <div key={platform.id} className="flex flex-col items-center gap-2">
      <Image src={platform.icon} width={48} height={48} />
      <span className="text-xs text-center">{platform.name}</span>
    </div>
  ))}
</div>
```

**Acceptance Criteria:**
- [ ] Consistent spacing between logos
- [ ] Grid layout responsive
- [ ] Logos aligned center
- [ ] Text doesn't overflow

---

### FE-2.5-11: Content Detail - Gallery Photo Modal
**Priority:** 🟢 LOW
**Estimate:** 2 days
**Owner:** _Assign_
**Dependencies:** None

**Feature:**
Click on gallery photo to open in full-screen modal with navigation.

**Implementation:**
```typescript
const [selectedImage, setSelectedImage] = useState<number | null>(null);

// Gallery
{images.map((img, index) => (
  <Image
    key={index}
    src={img.url}
    onClick={() => setSelectedImage(index)}
    className="cursor-pointer hover:opacity-80"
  />
))}

// Modal
{selectedImage !== null && (
  <Modal onClose={() => setSelectedImage(null)}>
    <Image src={images[selectedImage].url} fill />
    <button onClick={() => setSelectedImage(Math.max(0, selectedImage - 1))}>
      Previous
    </button>
    <button onClick={() => setSelectedImage(Math.min(images.length - 1, selectedImage + 1))}>
      Next
    </button>
  </Modal>
)}
```

**Acceptance Criteria:**
- [ ] Click photo opens modal
- [ ] Photo displays full screen
- [ ] Can navigate between photos
- [ ] Keyboard navigation (arrow keys)
- [ ] Close on ESC or click outside
- [ ] Mobile swipe gestures

---

### FE-2.5-12: Homepage - Metadata on Card Hover
**Priority:** 🟢 LOW
**Estimate:** 0.5 days
**Owner:** _Assign_
**Dependencies:** None

**Current Behavior:**
Card hover shows description (long text).

**New Behavior:**
Card hover shows metadata (release year, rating, genre).

**Implementation:**
```typescript
// Before:
<div className="hover-content">
  <p>{item.description}</p>
</div>

// After:
<div className="hover-content">
  <div className="metadata-grid">
    <span>{item.release_year}</span>
    <span>★ {item.rating}</span>
    <span>{item.genre}</span>
  </div>
</div>
```

**Acceptance Criteria:**
- [ ] Shows metadata instead of description
- [ ] Compact, scannable format
- [ ] Consistent across all card types

---

### FE-2.5-13: Font Standardization
**Priority:** 🟢 LOW
**Estimate:** 1 day
**Owner:** _Assign_
**Dependencies:** None

**Current Issue:**
Inconsistent font usage (font-display vs font-sans).

**Solution:**
- Headings, buttons, important text → `font-display`
- Body text, descriptions, metadata → `font-sans`

**Implementation:**
```typescript
// Audit all components
// Replace inconsistent font classes

// Before:
<p className="font-display">Regular body text</p>

// After:
<p className="font-sans">Regular body text</p>
```

**Acceptance Criteria:**
- [ ] Headings use font-display
- [ ] Body text uses font-sans
- [ ] Consistent across all pages
- [ ] Improved readability

---

### FE-2.5-14: List Detail - Background Full Fetch
**Priority:** 🟢 LOW
**Estimate:** 2 days
**Owner:** _Assign_
**Dependencies:** None

**Feature:**
Fetch paginated items for immediate display, but also fetch full list in background for faster navigation.

**Implementation:**
```typescript
// Immediate: Fetch page 1
const { items: page1Items } = useListItems(listId, { page: 1, page_size: 20 });

// Background: Fetch all
useEffect(() => {
  const fetchAll = async () => {
    const allItems = await api.get(`/api/lists/${listId}/items/?page_size=1000`);
    // Cache in React Query / SWR
    queryClient.setQueryData(['list-items-full', listId], allItems);
  };

  // Delay to not block initial render
  setTimeout(fetchAll, 1000);
}, [listId]);
```

**Acceptance Criteria:**
- [ ] Page 1 loads immediately
- [ ] Full list fetches in background
- [ ] Pagination still works
- [ ] Navigation between pages instant
- [ ] Doesn't block initial render

---

## ✅ Definition of Done

A task is complete when:
- [ ] Code implemented and tested locally
- [ ] No console errors or warnings
- [ ] **Responsive on mobile, tablet, and desktop** (CRITICAL for this sprint)
- [ ] Code reviewed by 1+ teammate
- [ ] Follows GUIDELINES.md standards
- [ ] Performance tested (no regressions)
- [ ] Accessibility tested (keyboard, screen readers)
- [ ] Merged to feature branch
- [ ] Tested on at least 2 devices (mobile + desktop)

---

## Sprint 2.5 Summary

**Critical:** 2 tasks (7 days)
**High:** 5 tasks (7 days)
**Medium:** 4 tasks (4 days)
**Low:** 6 tasks (6.5 days)

**Total Estimated:** 24.5 days → **2 weeks with 2 developers**

**Recommended Focus:**
- Week 1: Complete all CRITICAL and HIGH tasks
- Week 2: Complete MEDIUM tasks + as many LOW tasks as time allows

---

**Last Updated:** 2025-11-15
**Status:** NEW SPRINT - Insert between Sprint 2 and Sprint 3
**Next Steps:** Review and approve scope with team
