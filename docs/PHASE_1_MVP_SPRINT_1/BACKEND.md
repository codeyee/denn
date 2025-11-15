# Sprint 1 - Backend Tasks

> **Sprint Goal:** Implement critical API fixes that unblock frontend features
> **Team:** Backend

---

## 🔴 CRITICAL Tasks (Must Complete)

### BE-101: Include Owner in Members List
**Priority:** 🔴 CRITICAL (BLOCKS FE-201, FE-202)
**Estimate:** 2 days
**Owner:** _Assign_
**Frontend Impact:** Fixes permissions bugs, enables member ratings for owner

**Current Behavior:**
```json
{
  "id": 1,
  "name": "My Watchlist",
  "owner": {"id": 5, "username": "john"},
  "members": [
    {"id": 10, "username": "alice"},
    {"id": 12, "username": "bob"}
  ]
  // Owner (id: 5) NOT in members array ❌
}
```

**Expected Behavior:**
```json
{
  "id": 1,
  "name": "My Watchlist",
  "owner": {"id": 5, "username": "john"},
  "members": [
    {"id": 5, "username": "john", "is_owner": true},  // ✅ Owner included
    {"id": 10, "username": "alice"},
    {"id": 12, "username": "bob"}
  ]
}
```

**Affected Endpoints:**
- `GET /api/lists/{id}/`
- `GET /api/lists/`

**Implementation:**
1. Add owner to members queryset
2. Add `is_owner` boolean field to serializer
3. Apply to BOTH PERSONAL and COLLABORATIVE lists
4. Ensure no duplicate entries

**Acceptance Criteria:**
- [ ] Owner appears in members array for all lists
- [ ] Owner has `is_owner: true` flag
- [ ] No duplicate owner in members
- [ ] Works for PERSONAL and COLLABORATIVE lists
- [ ] Existing tests updated
- [ ] API documentation updated

**Testing:**
- [ ] Personal list - owner in members
- [ ] Collaborative list - owner in members
- [ ] Owner can see own ratings
- [ ] Permissions work correctly

---

### BE-102: Filter Invalid TV Show Seasons
**Priority:** 🔴 CRITICAL (BLOCKS FE-203)
**Estimate:** 3 days
**Owner:** _Assign_
**Frontend Impact:** Prevents users from adding unreleased seasons

**Current Issue:**
API returns seasons with 0 episodes, no air date, or future dates.

**Filtering Rules:**
DO NOT return seasons where:
1. `episode_count` == 0
2. `episode_count` == 1 AND `air_date` is null
3. `episode_count` == 1 AND `air_date` > (today + 1 day)
4. `air_date` is null AND `episode_count` < 2

**Allow seasons where:**
- `episode_count` >= 2 (regardless of air date)
- `air_date` <= (today + 1 day)

**Example:**
```json
// BEFORE (considering we are on 2025-11-30)
{
  "seasons": [
    {"season_number": 1, "episode_count": 7, "air_date": "2008-01-20"},  // ✅ Valid
    {"season_number": 2, "episode_count": 0, "air_date": "2009-03-08"},  // ❌ Filter out
    {"season_number": 3, "episode_count": 1, "air_date": null},  // ❌ Filter out
    {"season_number": 4, "episode_count": 1, "air_date": "2026-01-01"},  // ❌ Filter out
    {"season_number": 5, "episode_count": 2, "air_date": "2025-12-01"}  // ✅ Valid (future but has episodes)
  ]
}

// AFTER (considering we are on 2025-11-30)
{
  "seasons": [
    {"season_number": 1, "episode_count": 7, "air_date": "2008-01-20"},
    {"season_number": 5, "episode_count": 2, "air_date": "2025-12-01"}
  ]
}
```

**Affected Endpoints:**
- `GET /api/content/{id}/` (for TV shows)

**Implementation:**
```python
# Pseudocode
def filter_valid_seasons(seasons):
    valid_seasons = []
    today = datetime.now().date()

    for season in seasons:
        # Filter out invalid seasons
        if season.episode_count == 0:
            continue
        if season.episode_count == 1 and not season.air_date:
            continue
        if season.episode_count == 1 and season.air_date > today + timedelta(days=1):
            continue
        if not season.air_date and season.episode_count < 2:
            continue

        valid_seasons.append(season)

    return valid_seasons
```

**Acceptance Criteria:**
- [ ] Seasons filtered according to rules
- [ ] 1-day timezone margin for air_date
- [ ] Works for all TV show endpoints
- [ ] Edge cases handled (null dates, 0 episodes)
- [ ] Tests for all filter rules
- [ ] API documentation updated

**Testing:**
- [ ] Season with 0 episodes - filtered out
- [ ] Season with 1 ep + no date - filtered out
- [ ] Season with 1 ep + future date - filtered out
- [ ] Season with 2+ eps + future date - included
- [ ] Valid season - included

---

### BE-103: Return Owner's Ratings in member_ratings
**Priority:** 🟡 HIGH (IMPROVES FE-204)
**Estimate:** 2 days
**Owner:** _Assign_
**Frontend Impact:** Owner's ratings visible in list views

**Current Behavior:**
```json
{
  "id": 123,
  "member_ratings": [
    {"user": {"id": 10}, "rating": 8.5},
    {"user": {"id": 12}, "rating": 9.0}
  ],
  "added_by": {"id": 5}
  // Owner's rating (user 5) missing ❌
}
```

**Expected Behavior:**
```json
{
  "id": 123,
  "member_ratings": [
    {"user": {"id": 5}, "rating": 9.5, "is_owner": true},  // ✅ Owner included
    {"user": {"id": 10}, "rating": 8.5},
    {"user": {"id": 12}, "rating": 9.0}
  ],
  "added_by": {"id": 5}
}
```

**Affected Endpoints:**
- `GET /api/lists/{id}/items/`

**Implementation:**
1. Include list owner's rating in queryset
2. Add `is_owner` flag to ratings serializer
3. Apply to all list types

**Acceptance Criteria:**
- [ ] Owner's rating in member_ratings array
- [ ] No duplicate ratings for same user
- [ ] Works for PERSONAL and COLLABORATIVE lists
- [ ] `is_owner` flag correctly set
- [ ] Tests updated

**Testing:**
- [ ] Owner rated item - rating shows
- [ ] Owner hasn't rated - not in array
- [ ] Collaborative list - owner rating shows
- [ ] Personal list - owner rating shows

---

### BE-104: Fix Homepage List Count
**Priority:** 🟡 HIGH (FIXES FE-205)
**Estimate:** 1 day
**Owner:** _Assign_
**Frontend Impact:** Homepage shows correct total item counts

**Current Issue:**
`item_count` returns the preview size (or null) instead of actual total count.

**Request:**
```http
GET /api/lists/?items_size=6
```

**Current (Wrong):**
```json
{
  "id": 1,
  "name": "My Watchlist",
  "item_count": "6"/null,  // ❌ Should be actual total (e.g., 47)
  "items": [...]  // 6 items
}
```

**Expected (Correct):**
```json
{
  "id": 1,
  "name": "My Watchlist",
  "item_count": "47",  // ✅ Actual total count
  "items": [...]  // 6 items (preview)
}
```

**Implementation:**
`item_count` should ALWAYS return the total number of items in the list, regardless of the `items_size` query parameter.

**Acceptance Criteria:**
- [ ] `item_count` returns actual total
- [ ] Independent of items_size parameter
- [ ] Works for empty lists (returns 0)
- [ ] Type is string (for consistency)
- [ ] Tests updated

**Testing:**
- [ ] List with 50 items, items_size=6 → count=50
- [ ] List with 0 items → count=0
- [ ] List with 5 items, items_size=10 → count=5

## ✅ Definition of Done

A task is complete when:
- [ ] Code implemented and tested
- [ ] Unit tests written and passing
- [ ] Integration tests updated
- [ ] API documentation updated (Swagger/Postman)
- [ ] Code reviewed by 1+ teammate
- [ ] Frontend team notified of completion
- [ ] Deployed to staging environment

---

## 🚀 Deployment Notes

**Migration Required:**
- BE-101: May need migration if adding database fields
- BE-102: No migration (filtering only)
- BE-103: May need migration if changing rating model
- BE-104: No migration (serializer change only)

**Backward Compatibility:**
- BE-101: Adding owner to members is backward compatible
- BE-102: Filtering reduces response size (compatible)
- BE-103: Adding ratings is backward compatible
- BE-104: Fixing count is backward compatible
