# Sprint 1 - Optimization Integration (Week 1)

> **Sprint Goal:** Integrate Dynamic Fetching to reduce load times and data usage
> **Duration:** 1 week
> **Team:** Frontend

---

## ⚠️ PREREQUISITES

**Before starting this sprint, ensure:**

-   [ ] BE-101: Install & Configure `drf-flex-fields` (Deployed to Staging) ✅
-   [ ] BE-102: Refactor Core Serializers (Deployed to Staging) ✅

---

## 🔴 CRITICAL Tasks (Must Complete)

### FE-101: Update API Client for Query Params

**Priority:** 🔴 CRITICAL (Core Utility)
**Estimate:** 0.5 days
**Owner:** _Assign_

**Current Behavior:**
API calls are static URLs: `api.get('/lists/1/')`

**New Behavior:**
Create a utility/hook to construct Flex Field queries easily.

**Implementation:**

```typescript
// utils/api.ts or hooks/useApi.ts

interface FetchOptions {
    fields?: string[];
    expand?: string[];
    [key: string]: any;
}

export const buildQuery = (options: FetchOptions) => {
    const params = new URLSearchParams();
    if (options.fields) params.append("fields", options.fields.join(","));
    if (options.expand) params.append("expand", options.expand.join(","));
    return params.toString();
};

// Usage:
// const query = buildQuery({ fields: ['id', 'title'], expand: ['owner'] });
// api.get(`/lists/1/?${query}`)
```

**Acceptance Criteria:**

-   [ ] Helper function `buildQuery` created
-   [ ] Supports array input for fields and expands
-   [ ] Handles existing query params (e.g., page, search) gracefully

---

### FE-102: System-wide API Fetching Optimization

**Priority:** 🔴 CRITICAL (Performance Overhaul)
**Estimate:** 3 days
**Owner:** _Assign_
**Uses Backend:** BE-101, BE-102

**Current Behavior:**
The application currently uses "naive" fetching strategies across all pages.

-   **Over-fetching:** We request full objects (20+ fields) when displaying simple cards (needs 3 fields).
-   **Under-fetching:** Components trigger "waterfall" requests (e.g., fetching a List, then fetching its Owner separately).

**Goal:**
Audit and refactor all major data-fetching points in the application to leverage the new `?fields=` and `?expand=` capabilities.

**Scope of Refactor:**

1.  **AddToListModal:** Fetch only `id`, `name`, `item_count` of user lists.
2.  **Content Cards (Grid View):** Fetch only `id`, `title`, `poster_path`, `rating` (exclude descriptions, cast, huge metadata).
3.  **List Detail Page:** Combine List + Items + Owner into a single request.
4.  **Navbar/User Menu:** Fetch minimal user profile info.

**Implementation Strategy:**

**1. Create a "Fetch Config" for consistent usage:**

```typescript
// Example refactor for a Card Component
// BEFORE: GET /api/movies/popular/ (Returns 50KB JSON)
// const { data } = useSWR('/api/movies/popular/');

// AFTER: GET /api/movies/popular/?fields=id,title,poster_path,vote_average (Returns 5KB JSON)
const query = buildQuery({
    fields: ["id", "title", "poster_path", "vote_average"],
});
const { data } = useSWR(`/api/movies/popular/?${query}`);
```

**2. Eliminate Request Waterfalls (Under-fetching):**

```typescript
// BEFORE (EXAMPLE):
// useSWR(`/api/lists/${id}/`) -> wait -> useSWR(`/api/users/${list.owner_id}/`)

// AFTER:
const query = buildQuery({
    expand: ["owner", "items.content_item"],
    fields: ["id", "name", "owner", "items"],
});
const { data } = useSWR(`/api/lists/${id}/?${query}`);
```

**Acceptance Criteria:**

-   [ ] **Audit:** Identify top 5 heaviest API calls in the app.
-   [ ] **Refactor:** Apply `fields` filtering to all Lists and Grid views.
-   [ ] **Refactor:** Apply `expand` to List Detail and Profile views.
-   [ ] **Metric:** Reduce payload size of "Home" and "List Detail" by at least 60%.
-   [ ] **Metric:** Eliminate at least 2 chains of sequential requests (waterfalls).
-   [ ] No regression in UI (data displayed remains correct).

## 🟢 MEDIUM PRIORITY Tasks

### FE-103: Create Type Interfaces for Partial Responses

**Priority:** 🟢 MEDIUM (DX)
**Estimate:** 1 day
**Owner:** _Assign_

**Problem:**
TypeScript types usually define the _Full_ model. When we request partial fields, TS might think we have fields that are actually `undefined`.

**Implementation:**
Use TypeScript utilities like `Pick` or create specific DTOs for heavily used partials.

```typescript
// types/list.ts
export interface ListFull { ... }

// For the Modal
export type ListSummary = Pick<ListFull, 'id' | 'name' | 'item_count'>;
```

**Acceptance Criteria:**

-   [ ] `ListSummary` type created
-   [ ] `ListItemBasic` type created
-   [ ] Components using optimized calls use the narrowed types

---

## ✅ Definition of Done

-   [ ] Code implemented and tested locally
-   [ ] Network tab shows reduced payload sizes
-   [ ] No visual regressions
-   [ ] Typescript compiles without "any" hacks regarding partial data
