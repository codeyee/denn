# Backend Requirements - DENN Project

> **Document Version:** 1.0
> **Date:** 2025-11-15
> **For:** Backend Development Team
> **Purpose:** API changes required for MVP and future releases
> **Contact:** Frontend Team

---

## 📋 Table of Contents

- [Overview](#overview)
- [🔴 CRITICAL - MVP Blockers](#-critical---mvp-blockers)
- [🟡 HIGH PRIORITY - MVP Required](#-high-priority---mvp-required)
- [🟢 MEDIUM PRIORITY - MVP Nice-to-Have](#-medium-priority---mvp-nice-to-have)
- [🔵 FUTURE - Post-MVP](#-future---post-mvp)
- [Implementation Timeline](#implementation-timeline)
- [API Specifications](#api-specifications)

---

## Overview

This document outlines backend API changes required to support the DENN frontend MVP and future releases. Requirements are prioritized based on their impact on user experience and MVP launch timeline.

**MVP Launch Target:** 8 weeks from now

**Priority Levels:**
- 🔴 **CRITICAL:** Must have for MVP launch (Blocks features/causes bugs)
- 🟡 **HIGH:** Strongly needed for MVP (Degrades UX significantly)
- 🟢 **MEDIUM:** Nice to have for MVP (Improves UX/performance)
- 🔵 **FUTURE:** Post-MVP (Feature enhancements)

---

## 🔴 CRITICAL - MVP Blockers

### REQ-001: Include Owner in Members List

**Priority:** 🔴 CRITICAL (MVP Blocker)
**Impact:** Fixes multiple frontend bugs related to permissions and member ratings
**Affected Endpoints:**
- `GET /api/lists/{id}/`
- `GET /api/lists/`

**Current Behavior:**
```json
{
  "id": 1,
  "name": "My Watchlist",
  "owner": {
    "id": 5,
    "username": "john_doe"
  },
  "members": [
    {"id": 10, "username": "alice"},
    {"id": 12, "username": "bob"}
  ],
  // Owner (id: 5) is NOT in members array
  "list_type": "COLLABORATIVE"
}
```

**Expected Behavior:**
```json
{
  "id": 1,
  "name": "My Watchlist",
  "owner": {
    "id": 5,
    "username": "john_doe"
  },
  "members": [
    {"id": 5, "username": "john_doe", "is_owner": true},  // ← Owner included
    {"id": 10, "username": "alice"},
    {"id": 12, "username": "bob"}
  ],
  "list_type": "COLLABORATIVE"
}
```

**Requirements:**
1. Owner should ALWAYS be included in `members` array
2. Add optional `is_owner: true` flag to identify owner in members list
3. Apply to BOTH `PERSONAL` and `COLLABORATIVE` lists
4. Maintain backward compatibility if possible

**Why This is Critical:**
- Frontend currently checks `members` array for permissions
- Member ratings not showing for owner
- Collaborative features broken for list owner

**Acceptance Criteria:**
- [ ] Owner appears in members array for all lists
- [ ] Owner has `is_owner: true` flag
- [ ] Existing tests updated
- [ ] No duplicate owner entries

---

### REQ-002: Filter Invalid TV Show Seasons

**Priority:** 🔴 CRITICAL (MVP Blocker)
**Impact:** Prevents users from adding incomplete/unreleased seasons to lists
**Affected Endpoints:**
- `GET /api/content/{id}/` (for TV shows)
- Any endpoint returning `TVShowDetail` with seasons

**Current Behavior:**
Returns seasons that should be filtered:
```json
{
  "id": "1234",
  "content_type": "TV_SHOW",
  "name": "Breaking Bad",
  "seasons": [
    {
      "season_number": 1,
      "episode_count": 7,
      "air_date": "2008-01-20"
    },
    {
      "season_number": 2,
      "episode_count": 0,  // ❌ No episodes
      "air_date": "2009-03-08"
    },
    {
      "season_number": 3,
      "episode_count": 1,
      "air_date": null  // ❌ No air date
    },
    {
      "season_number": 4,
      "episode_count": 1,
      "air_date": "2026-01-01"  // ❌ Future date
    },
    {
      "season_number": 5,
      "episode_count": 2,
      "air_date": "2025-12-01"  // ✅ Valid (future but has episodes)
    }
  ]
}
```

**Expected Behavior:**
```json
{
  "id": "1234",
  "content_type": "TV_SHOW",
  "name": "Breaking Bad",
  "seasons": [
    {
      "season_number": 1,
      "episode_count": 7,
      "air_date": "2008-01-20"
    },
    {
      "season_number": 5,
      "episode_count": 2,
      "air_date": "2025-12-01"
    }
    // Seasons 2, 3, 4 filtered out
  ]
}
```

**Filtering Rules:**
DO NOT return seasons that meet ANY of these criteria:
1. `episode_count` is 0
2. `episode_count` is 1 AND `air_date` is null
3. `episode_count` is 1 AND `air_date` > (today + 1 day)
4. `air_date` is null AND `episode_count` < 2

**Allow seasons that:**
- Have 2+ episodes (regardless of air date)
- Have aired (air_date <= today + 1 day margin for timezones)

**Why This is Critical:**
- Users can't add incomplete seasons to lists
- Causes confusion ("Why is this empty season showing?")
- AddToListModal shows invalid options

**Acceptance Criteria:**
- [ ] Seasons filtered according to rules above
- [ ] 1-day timezone margin for air_date checks
- [ ] Works for all TV show content endpoints
- [ ] Updated tests for edge cases

---

### REQ-003: Return Owner's Ratings in member_ratings

**Priority:** 🟡 HIGH (MVP Required)
**Impact:** Owner's ratings not visible in list views
**Affected Endpoints:**
- `GET /api/lists/{id}/items/`

**Current Behavior:**
```json
{
  "id": 123,
  "content_item": {...},
  "status": "COMPLETED",
  "member_ratings": [
    {"user": {"id": 10}, "rating": 8.5},
    {"user": {"id": 12}, "rating": 9.0}
    // Owner's rating (user_id: 5) missing
  ],
  "added_by": {"id": 5}  // Owner
}
```

**Expected Behavior:**
```json
{
  "id": 123,
  "content_item": {...},
  "status": "COMPLETED",
  "member_ratings": [
    {"user": {"id": 5}, "rating": 9.5, "is_owner": true},  // ← Owner included
    {"user": {"id": 10}, "rating": 8.5},
    {"user": {"id": 12}, "rating": 9.0}
  ],
  "added_by": {"id": 5}
}
```

**Requirements:**
1. Include list owner's rating in `member_ratings` array
2. Add optional `is_owner: true` flag
3. Apply to all list types (PERSONAL and COLLABORATIVE)

**Acceptance Criteria:**
- [ ] Owner's rating appears in member_ratings
- [ ] No duplicate ratings for same user
- [ ] Works for both PERSONAL and COLLABORATIVE lists

---

## 🟡 HIGH PRIORITY - MVP Required

### REQ-004: Calculate list_rating and member_rating_count Server-Side

**Priority:** 🟡 HIGH (MVP Required)
**Impact:** Prevents N+1 queries on frontend, improves performance
**Affected Endpoints:**
- `GET /api/lists/{id}/items/`

**Current Behavior:**
Frontend must calculate averages client-side:
```json
{
  "id": 123,
  "content_item": {...},
  "member_ratings": [
    {"rating": 8.5},
    {"rating": 9.0},
    {"rating": 7.5}
  ]
  // Frontend calculates: avg = 8.33, count = 3
}
```

**Expected Behavior:**
Backend pre-calculates and includes:
```json
{
  "id": 123,
  "content_item": {...},
  "member_ratings": [
    {"rating": 8.5},
    {"rating": 9.0},
    {"rating": 7.5}
  ],
  "list_rating": 8.33,  // ← Average of all member ratings
  "member_rating_count": 3  // ← Count of members who rated
}
```

**Calculation Logic:**
```python
# Pseudocode
list_rating = average(member_ratings.rating) if member_ratings else None
member_rating_count = count(member_ratings)
```

**Why This is Important:**
- Frontend currently loops through all items calculating averages
- Performance issue for large lists (100+ items)
- Reduces client-side computation

**Acceptance Criteria:**
- [ ] `list_rating` field added (float or null)
- [ ] `member_rating_count` field added (integer)
- [ ] Correctly handles items with 0 ratings (null/0)
- [ ] Efficient database query (avoid N+1)

---

### REQ-005: Remove `notes` Field from List Items

**Priority:** 🟡 HIGH (Cleanup)
**Impact:** Simplifies data model, not used in UI
**Affected Endpoints:**
- `GET /api/lists/{id}/items/`
- `POST /api/lists/{id}/items/`
- `PATCH /api/lists/{id}/items/{item_id}/`

**Current Behavior:**
```json
{
  "id": 123,
  "content_item": {...},
  "status": "PENDING",
  "notes": "Watch this next weekend"  // ← Not used in frontend
}
```

**Expected Behavior:**
```json
{
  "id": 123,
  "content_item": {...},
  "status": "PENDING"
  // No notes field
}
```

**Requirements:**
1. Deprecate `notes` field from API responses
2. Optionally: Keep in database for future use but don't expose in API
3. Remove from serializers and API documentation

**Migration Strategy:**
- Phase 1: Make `notes` optional in POST/PATCH (don't reject if sent)
- Phase 2: Remove from GET responses
- Phase 3: Remove from database (optional)

**Acceptance Criteria:**
- [ ] `notes` field removed from API responses
- [ ] POST/PATCH endpoints still accept notes (ignore gracefully)
- [ ] Updated API documentation

---

### REQ-006: Filter Content with Future/Null Release Dates

**Priority:** 🟢 MEDIUM (MVP Nice-to-Have)
**Impact:** Prevents unreleased content from showing in search/lists
**Affected Endpoints:**
- `GET /api/content/search/`
- `GET /api/content/` (all content listing endpoints)

**Current Behavior:**
Returns unreleased content:
```json
{
  "results": [
    {
      "id": 1,
      "title": "Movie A",
      "release_date": "2020-01-15"  // ✅ Released
    },
    {
      "id": 2,
      "title": "Movie B",
      "release_date": null  // ❌ No release date
    },
    {
      "id": 3,
      "title": "Movie C",
      "release_date": "2026-06-01"  // ❌ Future release
    }
  ]
}
```

**Expected Behavior:**
```json
{
  "results": [
    {
      "id": 1,
      "title": "Movie A",
      "release_date": "2020-01-15"
    }
    // Movies B and C filtered out
  ]
}
```

**Filtering Rules:**
DO NOT return content where:
- `release_date` is null
- `release_date` > (today + 1 day)  // 1-day margin for timezone issues

**Exception:**
For TV shows, this applies to the **show's first air date**, not individual episodes.

**Why This Matters:**
- Users see unreleased content in search results
- Confusing UX ("Why can't I watch this?")
- Database pollution with TBA content

**Acceptance Criteria:**
- [ ] Filter applied to all content listing endpoints
- [ ] 1-day timezone margin
- [ ] Option to disable filter (query param `include_unreleased=true`)
- [ ] TV shows filtered by series air date

---

## 🟢 MEDIUM PRIORITY - MVP Nice-to-Have

### REQ-007: Multi-Search Endpoint (Reduce API Calls)

**Priority:** 🟢 MEDIUM (Performance Optimization)
**Impact:** Reduces 5 API calls to 1 for each search query
**New Endpoint:** `POST /api/content/multi-search/`

**Current Frontend Behavior:**
Makes 5 separate requests for each search:
```
GET /api/content/search/?type=MOVIE&q=inception
GET /api/content/search/?type=TV_SHOW&q=inception
GET /api/content/search/?type=GAME&q=inception
GET /api/content/search/?type=MUSIC&q=inception
GET /api/content/search/?type=BOOK&q=inception
```

**Proposed Solution:**
Single endpoint that searches all content types:

**Request:**
```http
POST /api/content/multi-search/
Content-Type: application/json

{
  "query": "inception",
  "content_types": ["MOVIE", "TV_SHOW", "GAME", "MUSIC", "BOOK"],
  "limit_per_type": 10
}
```

**Response:**
```json
{
  "query": "inception",
  "results": {
    "movies": [
      {"id": 1, "title": "Inception", "source_api": "TMDB", ...},
      ...
    ],
    "tv_shows": [
      {"id": 2, "title": "Inception: The Series", ...},
      ...
    ],
    "games": [],
    "music": [
      {"id": 3, "title": "Inception Soundtrack", ...}
    ],
    "books": []
  },
  "total_results": 15
}
```

**Parameters:**
- `query` (required): Search string
- `content_types` (optional): Array of content types to search (default: all)
- `limit_per_type` (optional): Max results per type (default: 10)

**Benefits:**
- 80% reduction in HTTP requests
- Faster search experience
- Lower server load
- Easier to implement request cancellation

**Acceptance Criteria:**
- [ ] Endpoint returns results grouped by content type
- [ ] Searches across all specified content types in parallel
- [ ] Respects limit_per_type parameter
- [ ] Returns empty arrays for types with no results
- [ ] Compatible with existing search functionality

---

### REQ-008: Check Item in User's Lists Endpoint

**Priority:** 🟢 MEDIUM (UX Improvement)
**Impact:** Show users which lists already contain an item
**New Endpoint:** `GET /api/lists/check-item/`

**Use Case:**
When user views content detail page or hovers over card, show which lists it's already in.

**Request:**
```http
GET /api/lists/check-item/?content_item_id=123&user_id=5
```

**Response:**
```json
{
  "content_item_id": 123,
  "user_id": 5,
  "in_lists": [
    {
      "id": 1,
      "name": "Watchlist",
      "list_type": "PERSONAL"
    },
    {
      "id": 5,
      "name": "Favorites",
      "list_type": "PERSONAL"
    }
  ],
  "total_count": 2
}
```

**Alternative (If Simpler):**
Add to existing content item endpoint:
```http
GET /api/content/{id}/?user_id=5&include_lists=true
```

**Benefits:**
- Prevent duplicate additions
- Show visual indicator (checkmark) in AddToListModal
- Better UX ("This is already in your Watchlist")

**Acceptance Criteria:**
- [ ] Returns all lists containing the item for given user
- [ ] Performant for users with many lists
- [ ] Works for authenticated user only
- [ ] Returns empty array if item not in any lists

---

### REQ-009: Validate Duplicate Items Before Adding

**Priority:** 🟢 MEDIUM (Data Integrity)
**Impact:** Prevents duplicate items in same list
**Affected Endpoint:** `POST /api/lists/{id}/items/`

**Current Behavior:**
Allows duplicate items (same content_item in same list)

**Expected Behavior:**
Return 400 error if item already exists:

**Request:**
```http
POST /api/lists/1/items/
{
  "content_item_id": 123
}
```

**Response (if already exists):**
```http
HTTP/1.1 400 Bad Request
{
  "error": "DUPLICATE_ITEM",
  "message": "This item is already in the list",
  "existing_item_id": 456
}
```

**Response (if successful):**
```http
HTTP/1.1 201 Created
{
  "id": 789,
  "content_item_id": 123,
  ...
}
```

**Requirements:**
1. Check if content_item already exists in list before adding
2. Return specific error code for duplicates
3. Include existing item ID in error response

**Acceptance Criteria:**
- [ ] Returns 400 for duplicate items
- [ ] Specific error code/message
- [ ] Check based on content_item_id + list_id
- [ ] Updated API documentation

---

### REQ-010: Homepage List Preview - Random Items

**Priority:** 🟢 MEDIUM (UX Polish)
**Impact:** More engaging homepage experience
**Affected Endpoint:** `GET /api/lists/`

**Current Behavior:**
Returns first N items (always same items):
```http
GET /api/lists/?items_size=6
```
```json
{
  "results": [
    {
      "id": 1,
      "name": "My Watchlist",
      "items": [
        {"id": 1, "title": "Movie A"},  // Always first 6
        {"id": 2, "title": "Movie B"},
        ...
      ]
    }
  ]
}
```

**Expected Behavior:**
Returns random N items (different each time):
```json
{
  "results": [
    {
      "id": 1,
      "name": "My Watchlist",
      "items": [
        {"id": 15, "title": "Movie P"},  // Random selection
        {"id": 3, "title": "Movie C"},
        {"id": 22, "title": "Movie W"},
        ...
      ]
    }
  ]
}
```

**Implementation Suggestion:**
```python
# Pseudocode
if items_size > 0:
    items = list.items.order_by('?')[:items_size]  # Random order
else:
    items = list.items.all()
```

**Benefits:**
- More engaging homepage
- Users discover different items each visit
- Encourages exploration

**Acceptance Criteria:**
- [ ] Items returned in random order when items_size specified
- [ ] Different items on each request
- [ ] Performance acceptable (avoid full table scan)
- [ ] Still respects items_size limit

---

### REQ-011: Homepage List Count - Return Actual Total

**Priority:** 🟡 HIGH (Bug Fix)
**Impact:** Homepage shows incorrect item counts
**Affected Endpoint:** `GET /api/lists/?items_size=6`

**Current Behavior:**
```json
{
  "results": [
    {
      "id": 1,
      "name": "My Watchlist",
      "item_count": "6",  // ❌ Wrong - should be actual count
      "items": [...]  // 6 items
    }
  ]
}
```

**Expected Behavior:**
```json
{
  "results": [
    {
      "id": 1,
      "name": "My Watchlist",
      "item_count": "47",  // ✅ Actual total count
      "items": [...]  // 6 items (preview)
    }
  ]
}
```

**Issue:**
`item_count` should always return total number of items in list, regardless of `items_size` parameter.

**Acceptance Criteria:**
- [ ] `item_count` always returns actual total
- [ ] Independent of items_size parameter
- [ ] Works for empty lists (item_count: 0)

---

## 🔵 FUTURE - Post-MVP

### REQ-012: Random List Items Endpoint (Future Feature)

**Priority:** 🔵 FUTURE (Post-MVP)
**Impact:** Enables "Pick random item" feature
**New Endpoint:** `GET /api/lists/{id}/items/random/`

**Use Case:**
"What should I watch?" feature - picks random pending item from list

**Request:**
```http
GET /api/lists/1/items/random/?count=1&status=PENDING
```

**Response:**
```json
{
  "items": [
    {
      "id": 123,
      "content_item": {...},
      "status": "PENDING"
    }
  ],
  "total_pending": 47
}
```

**Parameters:**
- `count` (optional): Number of random items (default: 1)
- `status` (optional): Filter by status (PENDING, COMPLETED, etc.)
- `content_type` (optional): Filter by content type

**Acceptance Criteria:**
- [ ] Returns truly random items
- [ ] Respects filters (status, content_type)
- [ ] Performant for large lists
- [ ] No duplicates if count > 1

---

### REQ-013: Search Caching with Case-Insensitive Keys

**Priority:** 🔵 FUTURE (Performance)
**Impact:** Reduces external API calls, faster search

**Requirement:**
Implement caching for search results with case-insensitive keys.

**Example:**
```
"inception" → Cache key: "inception"
"Inception" → Same cache key: "inception"
"INCEPTION" → Same cache key: "inception"
```

**Benefits:**
- Reduce calls to TMDB, Spotify, IGDB, etc.
- Faster search response
- Lower API costs

**Acceptance Criteria:**
- [ ] Search cache implemented
- [ ] Case-insensitive cache keys
- [ ] Configurable TTL (e.g., 24 hours)
- [ ] Cache invalidation strategy

---

### REQ-014: Retry Logic with Exponential Backoff

**Priority:** 🔵 FUTURE (Reliability)
**Impact:** Better resilience to external API failures

**Requirement:**
Implement retry logic for external API calls (TMDB, Spotify, IGDB, OpenLibrary).

**Strategy:**
```python
# Pseudocode
max_retries = 3
backoff_times = [2, 4, 8]  # seconds

for attempt in range(max_retries):
    try:
        response = call_external_api()
        return response
    except (Timeout, ConnectionError) as e:
        if attempt < max_retries - 1:
            sleep(backoff_times[attempt])
        else:
            raise
```

**Acceptance Criteria:**
- [ ] Retry on timeout/connection errors
- [ ] Exponential backoff (2s, 4s, 8s)
- [ ] Don't retry on 4xx errors (client errors)
- [ ] Configurable max retries

---

## Implementation Timeline

### Week 1-2 (CRITICAL)
- [ ] REQ-001: Include owner in members (2 days)
- [ ] REQ-002: Filter invalid TV seasons (3 days)
- [ ] REQ-003: Owner ratings in member_ratings (2 days)
- [ ] REQ-011: Fix homepage list count (1 day)

### Week 3-4 (HIGH PRIORITY)
- [ ] REQ-004: Calculate list_rating server-side (3 days)
- [ ] REQ-005: Remove notes field (1 day)
- [ ] REQ-006: Filter future release dates (2 days)
- [ ] REQ-009: Validate duplicates (2 days)

### Week 5-6 (MEDIUM PRIORITY)
- [ ] REQ-007: Multi-search endpoint (4 days)
- [ ] REQ-008: Check item in lists (2 days)
- [ ] REQ-010: Random list preview (1 day)

### Post-MVP (FUTURE)
- [ ] REQ-012: Random items endpoint
- [ ] REQ-013: Search caching
- [ ] REQ-014: Retry logic

---

## API Specifications

### Authentication
All endpoints marked `[Auth Required]` need JWT token in header:
```http
Authorization: Bearer <access_token>
```

### Pagination
Endpoints returning lists should support:
```http
GET /api/resource/?page=1&page_size=20
```

**Response format:**
```json
{
  "count": 100,
  "next": "http://api.com/resource/?page=2",
  "previous": null,
  "results": [...]
}
```

### Error Responses
Standard error format:
```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "field_errors": {
    "field_name": ["Error detail"]
  }
}
```

**Common Error Codes:**
- `DUPLICATE_ITEM`: Item already exists
- `NOT_FOUND`: Resource not found
- `PERMISSION_DENIED`: User lacks permission
- `VALIDATION_ERROR`: Invalid input
- `INVALID_SEASON`: Season doesn't meet requirements

---

## Testing Checklist

For each requirement, ensure:
- [ ] Unit tests for new logic
- [ ] Integration tests for endpoints
- [ ] Edge cases covered (empty lists, null values, etc.)
- [ ] Performance tested with large datasets
- [ ] API documentation updated
- [ ] Frontend team notified of changes

---

## Questions & Support

**Contact:**
- Frontend Lead: [Contact Info]
- Slack Channel: #denn-backend-frontend
- Weekly Sync: Fridays 2pm

**Documentation:**
- API Docs: [Link to Swagger/Postman]
- Database Schema: [Link]
- Architecture Diagram: [Link]

---

## Appendix: Data Models

### ListItem Model (Expected)
```typescript
interface ListItem {
  id: number;
  content_item: ContentItem;
  status: ItemStatus;
  added_at: string;
  completed_at: string | null;
  member_ratings: MemberRating[];
  list_rating: number | null;  // NEW: Average rating
  member_rating_count: number;  // NEW: Count of ratings
  // notes: string;  // REMOVED
}
```

### MemberRating Model (Expected)
```typescript
interface MemberRating {
  id: number;
  user: User;
  rating: number;
  is_owner?: boolean;  // NEW: Optional flag
}
```

### List Model (Expected)
```typescript
interface List {
  id: number;
  name: string;
  description: string | null;
  owner: User;
  members: User[];  // CHANGED: Now includes owner
  list_type: ListType;
  item_count: string;  // FIXED: Always actual total
  items?: ListItem[];  // Optional, based on items_size
}
```

---

**Document Version:** 1.0
**Last Updated:** 2025-11-15
**Next Review:** After Week 2 implementation
