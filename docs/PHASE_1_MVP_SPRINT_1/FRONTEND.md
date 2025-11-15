# Sprint 1 - Frontend Tasks (Week 1-2)

> **Sprint Goal:** Fix critical blockers that prevent core functionality
> **Duration:** 2 weeks
> **Team:** Frontend
> **Coordination:** See [COORDINATION.md](./COORDINATION.md) for backend dependencies

---

## 🔴 CRITICAL Tasks (Must Complete)

### FE-101: Fix Rating Modal - Support Half Stars
**Priority:** 🔴 CRITICAL
**Estimate:** 1 day
**Owner:** _Assign_
**Dependencies:** None

**Current Issue:**
Rating modal in ListDetailPage only allows full star ratings (1, 2, 3... 10), but ContentDetailPage supports half stars (8.5, 9.0, etc.).

**File:** `app/_components/common/modals/RateItemModal.tsx`

**Action:**
Reuse the same rating component from ContentDetailPage that supports 0.5 increments.

**Acceptance Criteria:**
- [ ] Rating modal allows half-star ratings (0.5 increments)
- [ ] Visual indicator shows half stars correctly
- [ ] Saves half-star values to backend
- [ ] Works on both desktop and mobile
- [ ] Consistent with ContentDetailPage rating UI

**Testing:**
- [ ] Rate item with 8.5 stars - saves correctly
- [ ] Rate item with 10.0 stars - saves correctly
- [ ] Visual matches ContentDetailPage
- [ ] Mobile touch works for half stars

---

### FE-102: Fix "Rate This Item" Prompt Logic
**Priority:** 🔴 CRITICAL
**Estimate:** 0.5 days
**Owner:** _Assign_
**Dependencies:** None

**Current Issue:**
"Rate this item" prompt appears even after user has already rated the item.

**File:** `app/_components/pages/ContentDetailPage/components/AboutSection.tsx`

**Action:**
Only show prompt if `userRating` is null or undefined.

**Code Fix:**
```typescript
// Only show if user hasn't rated
{!userRating && item.status === 'COMPLETED' && (
  <div className="rate-prompt">
    <p>Rate this item</p>
    <button onClick={openRatingModal}>Add Rating</button>
  </div>
)}
```

**Acceptance Criteria:**
- [ ] Prompt only shows if user hasn't rated
- [ ] Prompt hides after user submits rating
- [ ] Works for all content types
- [ ] No flash of prompt on page load

**Testing:**
- [ ] View unrated item - prompt shows
- [ ] View rated item - prompt doesn't show
- [ ] Rate item - prompt disappears

---

### FE-103: Fix AddToListModal Mobile Overflow
**Priority:** 🔴 HIGH
**Estimate:** 0.5 days
**Owner:** _Assign_
**Dependencies:** None

**Current Issue:**
"Add TV Show" and "Add Individual Seasons" buttons overflow modal container on small screens.

**File:** `app/_components/common/modals/AddToListModal/index.tsx`

**Action:**
Make buttons stack vertically on mobile using responsive CSS.

**CSS Fix:**
```css
/* Desktop: horizontal */
.tv-show-actions {
  display: flex;
  gap: 1rem;
}

/* Mobile: vertical */
@media (max-width: 768px) {
  .tv-show-actions {
    flex-direction: column;
  }
}
```

**Acceptance Criteria:**
- [ ] Buttons stack vertically on mobile (<768px)
- [ ] Buttons stay horizontal on desktop
- [ ] No overflow on any screen size
- [ ] Touch targets are adequate (min 44px)

**Testing:**
- [ ] iPhone SE (375px) - buttons stack
- [ ] iPad (768px) - buttons horizontal
- [ ] Desktop - buttons horizontal

---

### FE-104: Cancel Debounced Search Requests
**Priority:** 🟡 MEDIUM
**Estimate:** 1 day
**Owner:** _Assign_
**Dependencies:** None

**Current Issue:**
When user types quickly, previous search requests aren't cancelled, causing race conditions and wasted API calls.

**File:** `app/_components/pages/SearchPage/index.tsx`

**Action:**
Use AbortController to cancel in-flight requests when user types.

**Implementation:**
```typescript
useEffect(() => {
  const controller = new AbortController();

  const delaySearch = setTimeout(() => {
    performSearch(query, { signal: controller.signal });
  }, 300);

  return () => {
    clearTimeout(delaySearch);
    controller.abort(); // Cancel previous request
  };
}, [query]);
```

**Acceptance Criteria:**
- [ ] Previous search cancelled when user types
- [ ] Only latest search request completes
- [ ] No console errors from aborted requests
- [ ] Search feels responsive

**Testing:**
- [ ] Type quickly - only last search executes
- [ ] Network tab shows cancelled requests
- [ ] No race condition errors

---

## 🟢 NICE-TO-HAVE Tasks (If Time Permits)

### FE-105: Add Loading Skeletons for List Items
**Priority:** 🟢 LOW
**Estimate:** 1 day
**Owner:** _Assign_
**Dependencies:** None

**Current Issue:**
List items show blank space while loading, no visual feedback.

**Files:**
- `app/_components/pages/ListDetailPage/components/ListView/FlatListView.tsx`
- `app/_components/pages/ListDetailPage/components/ListView/GroupedListView.tsx`

**Action:**
Show skeleton placeholders while items are fetching (like homepage).

**Acceptance Criteria:**
- [ ] Skeletons match item layout
- [ ] Shows while loading, hides when data arrives
- [ ] Smooth transition to real content
- [ ] Works for both list and gallery views

---

### FE-106: Show "No Items Found" in Search
**Priority:** 🟢 LOW
**Estimate:** 0.5 days
**Owner:** _Assign_
**Dependencies:** None

**Current Issue:**
When search returns 0 results for a content type, entire section disappears.

**File:** `app/_components/pages/SearchPage/index.tsx`

**Action:**
Show "No movies found" message instead of hiding section.

**Acceptance Criteria:**
- [ ] Message shows when 0 results
- [ ] All content type sections always visible
- [ ] Clear empty state UI
- [ ] Helpful message (not just "No results")

---

### FE-107: Fix List Grouping Pagination Buttons
**Priority:** 🟢 LOW
**Estimate:** 0.5 days
**Owner:** _Assign_
**Dependencies:** None

**Current Issue:**
Pagination button styling broken in grouped view.

**File:** `app/_components/pages/ListDetailPage/components/ListSidebar.tsx`

**Action:**
Fix CSS for pagination controls in grouped mode.

**Acceptance Criteria:**
- [ ] Pagination buttons styled correctly
- [ ] Works in both flat and grouped views
- [ ] Responsive on mobile

---

## 📊 Sprint 1 Frontend Summary

| Priority | Tasks | Est. Days |
|----------|-------|-----------|
| 🔴 Critical | 3 | 2.0 |
| 🟡 Medium | 1 | 1.0 |
| 🟢 Low | 3 | 2.5 |
| **Total** | **7** | **5.5** |

**Recommended Focus:**
Complete FE-101 through FE-104 (critical + medium) = 3 days
Remaining time for nice-to-haves and testing.

---

## 🔗 Related Documents

- **Backend Tasks:** [BACKEND.md](./BACKEND.md)
- **Coordination:** [COORDINATION.md](./COORDINATION.md)
- **Guidelines:** [../PROJECT_GUIDELINES/GUIDELINES.md](../PROJECT_GUIDELINES/GUIDELINES.md)

---

## ✅ Definition of Done

A task is complete when:
- [ ] Code implemented and tested locally
- [ ] No console errors or warnings
- [ ] Responsive (mobile + desktop tested)
- [ ] Code reviewed by 1+ teammate
- [ ] Follows GUIDELINES.md standards
- [ ] Merged to feature branch

---

**Sprint Start:** Week 1 Monday
**Sprint End:** Week 2 Friday
**Next Sprint:** [Sprint 2](../PHASE_1_MVP_SPRINT_2/FRONTEND.md)
