# Sprint 2 - Backend Tasks (Week 3-4)

> **Sprint Goal:** Server-side optimizations and API improvements
> **Duration:** 2 weeks
> **Team:** Backend
> **Dependencies:** Sprint 1 Backend must be complete

---

## 🔴 CRITICAL Tasks (Must Complete)

### BE-201: Calculate list_rating and member_rating_count Server-Side
**Priority:** 🔴 CRITICAL (Required for frontend Sprint 2)
**Estimate:** 3 days
**Owner:** _Assign_
**Frontend Impact:** Frontend will display pre-calculated values (better performance)

**Current Behavior:**
Frontend calculates averages client-side (N+1 problem):
```json
{
  "id": 123,
  "member_ratings": [
    {"rating": 8.5},
    {"rating": 9.0},
    {"rating": 7.5}
  ]
  // Frontend must calculate: avg = 8.33, count = 3
}
```

**Expected Behavior:**
Backend pre-calculates and returns:
```json
{
  "id": 123,
  "member_ratings": [
    {"rating": 8.5},
    {"rating": 9.0},
    {"rating": 7.5}
  ],
  "list_rating": 8.33,           // ← Average of member ratings
  "member_rating_count": 3        // ← Count of ratings
}
```

**Calculation Logic:**
```python
# Pseudocode
list_rating = average(member_ratings.rating) if member_ratings else None
member_rating_count = count(member_ratings)

# Return None for list_rating if no ratings exist
# Return 0 for member_rating_count if no ratings
```

**Affected Endpoints:**
- `GET /api/lists/{id}/items/`

**Database Optimization:**
```python
# Use Django aggregation to avoid N+1
from django.db.models import Avg, Count

items = ListItem.objects.filter(list_id=list_id).annotate(
    list_rating=Avg('member_ratings__rating'),
    member_rating_count=Count('member_ratings')
)
```

**Acceptance Criteria:**
- [ ] `list_rating` field added (type: float or null)
- [ ] `member_rating_count` field added (type: integer)
- [ ] Correctly handles items with 0 ratings (null/0)
- [ ] Uses efficient database query (no N+1)
- [ ] Works for paginated results
- [ ] Returns None for list_rating if no ratings
- [ ] Tests for edge cases (0 ratings, 1 rating, many ratings)
- [ ] API documentation updated

**Testing:**
- [ ] Item with 0 ratings → list_rating: null, count: 0
- [ ] Item with 1 rating (9.0) → list_rating: 9.0, count: 1
- [ ] Item with 3 ratings (8, 9, 7) → list_rating: 8.0, count: 3
- [ ] Performance test with 100+ items

---

### BE-202: Multi-Search Endpoint (Reduce API Calls)
**Priority:** 🟡 HIGH (Big performance improvement)
**Estimate:** 4 days
**Owner:** _Assign_
**Frontend Impact:** Reduces 5 API calls to 1 per search

**Current Issue:**
Frontend makes 5 separate API calls for each search:
```
GET /api/content/search/?type=MOVIE&q=inception
GET /api/content/search/?type=TV_SHOW&q=inception
GET /api/content/search/?type=GAME&q=inception
GET /api/content/search/?type=MUSIC&q=inception
GET /api/content/search/?type=BOOK&q=inception
```

**New Endpoint:**
`POST /api/content/multi-search/`

**Request:**
```json
POST /api/content/multi-search/
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
      {
        "id": 1,
        "title": "Inception",
        "source_api": "TMDB",
        "external_id": "27205",
        "release_date": "2010-07-16",
        ...
      }
    ],
    "tv_shows": [],
    "games": [
      {
        "id": 2,
        "title": "Inception VR",
        "source_api": "IGDB",
        ...
      }
    ],
    "music": [
      {
        "id": 3,
        "title": "Inception Soundtrack",
        "source_api": "SPOTIFY",
        ...
      }
    ],
    "books": []
  },
  "total_results": 3,
  "search_time_ms": 245
}
```

**Parameters:**
- `query` (required, string): Search term
- `content_types` (optional, array): Types to search (default: all)
- `limit_per_type` (optional, integer): Max results per type (default: 10)

**Implementation:**
```python
# Pseudocode
async def multi_search(request):
    query = request.data.get('query')
    content_types = request.data.get('content_types', ALL_TYPES)
    limit = request.data.get('limit_per_type', 10)

    # Search all types in parallel
    tasks = []
    for content_type in content_types:
        task = search_content_type(content_type, query, limit)
        tasks.append(task)

    results = await asyncio.gather(*tasks)

    return {
        'query': query,
        'results': {
            'movies': results[0],
            'tv_shows': results[1],
            # ...
        },
        'total_results': sum(len(r) for r in results)
    }
```

**Acceptance Criteria:**
- [ ] Endpoint searches all specified content types
- [ ] Searches run in parallel (not sequential)
- [ ] Returns results grouped by content type
- [ ] Empty arrays for types with no results
- [ ] Respects limit_per_type parameter
- [ ] Returns search time for performance monitoring
- [ ] Error handling for external API failures
- [ ] Rate limiting applied
- [ ] API documentation with examples

**Testing:**
- [ ] Search with all types → returns all results
- [ ] Search with specific types → only those types
- [ ] limit_per_type=5 → max 5 results per type
- [ ] Invalid query → proper error message
- [ ] External API timeout → graceful degradation

**Performance Target:**
- Total search time < 500ms for all 5 types
- Uses connection pooling for external APIs
- Caches recent searches (optional)

---

## 🟡 HIGH PRIORITY Tasks

### BE-203: Validate Duplicate Items Before Adding
**Priority:** 🟡 HIGH (Data integrity)
**Estimate:** 2 days
**Owner:** _Assign_
**Frontend Impact:** Prevents duplicate items in lists

**Current Behavior:**
Backend allows adding same item multiple times to a list.

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
  "existing_item_id": 456,
  "existing_item": {
    "id": 456,
    "added_at": "2024-01-15T10:30:00Z",
    "status": "PENDING"
  }
}
```

**Response (if successful):**
```http
HTTP/1.1 201 Created
{
  "id": 789,
  "content_item_id": 123,
  "status": "PENDING",
  "added_at": "2024-01-20T14:25:00Z"
}
```

**Implementation:**
```python
# Pseudocode
def add_item_to_list(list_id, content_item_id):
    # Check if item already exists
    existing = ListItem.objects.filter(
        list_id=list_id,
        content_item_id=content_item_id
    ).first()

    if existing:
        raise ValidationError({
            'error': 'DUPLICATE_ITEM',
            'message': 'This item is already in the list',
            'existing_item_id': existing.id
        })

    # Create new item
    item = ListItem.objects.create(...)
    return item
```

**Acceptance Criteria:**
- [ ] Returns 400 for duplicate items
- [ ] Error code is "DUPLICATE_ITEM"
- [ ] Includes existing item ID in response
- [ ] Check based on content_item_id + list_id
- [ ] Works for all content types
- [ ] Tests for duplicate detection
- [ ] API documentation updated

**Testing:**
- [ ] Add item first time → 201 Created
- [ ] Add same item again → 400 Bad Request
- [ ] Different list, same item → 201 Created (allowed)
- [ ] Error message is user-friendly

---

### BE-204: Remove `notes` Field from List Items
**Priority:** 🟢 MEDIUM (Cleanup)
**Estimate:** 1 day
**Owner:** _Assign_
**Frontend Impact:** None (field not used)

**Current Behavior:**
```json
{
  "id": 123,
  "content_item": {...},
  "status": "PENDING",
  "notes": "Watch this next weekend"  // ← Not used
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

**Migration Strategy:**
1. **Phase 1:** Make `notes` optional in POST/PATCH (accept but ignore)
2. **Phase 2:** Remove from GET responses (this sprint)
3. **Phase 3:** Remove from database (optional, future)

**Implementation:**
```python
# Update serializer
class ListItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ListItem
        exclude = ['notes']  # Exclude from serialization
```

**Acceptance Criteria:**
- [ ] `notes` removed from all GET responses
- [ ] POST/PATCH still accept notes (ignore gracefully)
- [ ] No breaking changes for frontend
- [ ] Database field can remain (for potential future use)
- [ ] API documentation updated

---

### BE-205: Filter Content with Future/Null Release Dates
**Priority:** 🟢 MEDIUM (UX improvement)
**Estimate:** 2 days
**Owner:** _Assign_
**Frontend Impact:** Cleaner search results

**Current Behavior:**
Returns unreleased content:
```json
{
  "results": [
    {"title": "Movie A", "release_date": "2020-01-15"},  // ✅ Released
    {"title": "Movie B", "release_date": null},          // ❌ TBA
    {"title": "Movie C", "release_date": "2026-06-01"}   // ❌ Future
  ]
}
```

**Expected Behavior:**
```json
{
  "results": [
    {"title": "Movie A", "release_date": "2020-01-15"}
  ]
  // Movies B and C filtered out
}
```

**Filtering Rules:**
DO NOT return content where:
- `release_date` is null
- `release_date` > (today + 1 day)  // 1-day timezone margin

**Exception:**
For TV shows, filter by **series first air date**, not episode dates.

**Affected Endpoints:**
- `GET /api/content/search/`
- `GET /api/content/` (all listing endpoints)

**Implementation:**
```python
# Pseudocode
from datetime import datetime, timedelta

def filter_released_content(queryset):
    today = datetime.now().date()
    margin = timedelta(days=1)

    return queryset.filter(
        release_date__isnull=False,
        release_date__lte=today + margin
    )
```

**Optional Query Parameter:**
```
GET /api/content/search/?q=inception&include_unreleased=true
```

**Acceptance Criteria:**
- [ ] Filters null release dates
- [ ] Filters future releases (1-day margin)
- [ ] Optional parameter to disable filter
- [ ] Works for all content types
- [ ] TV shows filtered by series date
- [ ] Tests for edge cases

---

## 📊 Sprint 2 Backend Summary

| Priority | Tasks | Est. Days |
|----------|-------|-----------|
| 🔴 Critical | 1 | 3.0 |
| 🟡 High | 2 | 6.0 |
| 🟢 Medium | 2 | 3.0 |
| **Total** | **5** | **12.0** |

**Recommended Allocation:**
- 2 developers × 6 days = 12 days (exactly fits sprint)

---

## 🔗 Dependencies

**FROM Sprint 1 (Must be complete):**
- BE-101: Owner in members ✅
- BE-102: Filter invalid seasons ✅
- BE-103: Owner ratings ✅
- BE-104: List count fix ✅

**FOR Frontend (Will use in their Sprint 2):**
- BE-201: Calculated ratings (frontend displays)
- BE-202: Multi-search (frontend uses)
- BE-203: Duplicate validation (frontend shows errors)

---

## 🧪 Testing Requirements

### Unit Tests
- [ ] Calculated ratings with various scenarios
- [ ] Multi-search with different parameters
- [ ] Duplicate detection logic
- [ ] Release date filtering edge cases

### Integration Tests
- [ ] End-to-end multi-search flow
- [ ] Duplicate prevention with real database
- [ ] Performance test for calculated ratings (100+ items)

### Performance Tests
- [ ] Multi-search completes in <500ms
- [ ] Calculated ratings don't cause N+1 queries
- [ ] Load test: 100 concurrent searches

---

## 📋 Definition of Done

A task is complete when:
- [ ] Code implemented and tested
- [ ] Unit tests written (80%+ coverage)
- [ ] Integration tests passing
- [ ] Performance benchmarks met
- [ ] API documentation updated (Swagger)
- [ ] Code reviewed by 1+ teammate
- [ ] Deployed to staging
- [ ] Frontend team notified

---

**Sprint Start:** Week 3 Monday
**Sprint End:** Week 4 Friday
**Next Sprint:** [Sprint 3 Backend](../PHASE_1_MVP_SPRINT_3/BACKEND.md)
