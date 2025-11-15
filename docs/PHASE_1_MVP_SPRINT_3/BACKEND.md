# Sprint 2.5 - Backend Tasks (Week 5-6)

> **Sprint Goal:** API Improvements and Missing Endpoints from Legacy Requirements
> **Duration:** 2 weeks
> **Team:** Backend
> **Prerequisites:** Sprint 1 ✅ DONE, Sprint 2 Backend ✅ DONE

---

## ⚠️ PREREQUISITES

**Before starting this sprint, ensure:**
- [ ] BE-101: Owner in members ✅ DEPLOYED
- [ ] BE-102: Filter invalid seasons ✅ DEPLOYED
- [ ] BE-103: Owner ratings ✅ DEPLOYED
- [ ] BE-104: List count fix ✅ DEPLOYED
- [ ] BE-201: Calculated ratings ✅ DEPLOYED
- [ ] BE-202: Multi-search endpoint ✅ DEPLOYED
- [ ] BE-203: Duplicate validation ✅ DEPLOYED

---

## 🟡 HIGH PRIORITY Tasks

### BE-2.5-01: Check Item in User Lists Endpoint
**Priority:** 🟡 HIGH (Required for FE-2.5-05)
**Estimate:** 2 days
**Owner:** _Assign_
**Frontend Impact:** Enables pre-checking if item already in lists before adding

**Current Issue:**
No way for frontend to check if a content item exists in any of the user's lists without fetching all lists.

**New Endpoint:**
`GET /api/content/{content_item_id}/in-lists/?user_id={user_id}`

**Request:**
```http
GET /api/content/123/in-lists/?user_id=5
```

**Response:**
```json
{
  "content_item_id": 123,
  "user_id": 5,
  "in_lists": [
    {
      "id": 1,
      "name": "My Watchlist",
      "list_type": "PERSONAL",
      "added_at": "2024-01-15T10:30:00Z",
      "status": "PENDING"
    },
    {
      "id": 8,
      "name": "Sci-Fi Collection",
      "list_type": "COLLABORATIVE",
      "added_at": "2024-02-20T14:25:00Z",
      "status": "COMPLETED",
      "member_count": 3
    }
  ],
  "count": 2
}
```

**Response (if not in any list):**
```json
{
  "content_item_id": 123,
  "user_id": 5,
  "in_lists": [],
  "count": 0
}
```

**Implementation:**
```python
# views/content.py
from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(['GET'])
def check_item_in_lists(request, content_item_id):
    user_id = request.query_params.get('user_id')

    if not user_id:
        return Response({'error': 'user_id is required'}, status=400)

    # Find all lists where:
    # 1. User is owner or member
    # 2. List contains this content item
    lists_with_item = List.objects.filter(
        Q(owner_id=user_id) | Q(members__id=user_id)
    ).filter(
        list_items__content_item_id=content_item_id
    ).distinct()

    serialized_lists = []
    for list_obj in lists_with_item:
        # Get the specific list item for metadata
        list_item = ListItem.objects.get(
            list=list_obj,
            content_item_id=content_item_id
        )

        serialized_lists.append({
            'id': list_obj.id,
            'name': list_obj.name,
            'list_type': list_obj.list_type,
            'added_at': list_item.created_at,
            'status': list_item.status,
            'member_count': list_obj.members.count() if list_obj.list_type == 'COLLABORATIVE' else None
        })

    return Response({
        'content_item_id': content_item_id,
        'user_id': user_id,
        'in_lists': serialized_lists,
        'count': len(serialized_lists)
    })
```

**URL Configuration:**
```python
# urls.py
urlpatterns = [
    path('content/<int:content_item_id>/in-lists/', check_item_in_lists, name='check-item-in-lists'),
]
```

**Acceptance Criteria:**
- [ ] Returns all lists containing the specified content item
- [ ] Filtered by user (only their lists)
- [ ] Includes list metadata (name, type, added_at, status)
- [ ] Works for PERSONAL and COLLABORATIVE lists
- [ ] Returns empty array if not in any list
- [ ] Performance optimized (single query with joins)
- [ ] API documentation updated
- [ ] Tests for edge cases:
  - [ ] Item in 0 lists
  - [ ] Item in 1 list
  - [ ] Item in multiple lists
  - [ ] User has no lists
  - [ ] Invalid content_item_id
  - [ ] Missing user_id parameter

**Testing:**
```python
# tests/test_content_in_lists.py
def test_item_in_multiple_lists(self):
    # Create user with 3 lists
    user = User.objects.create(username='test')
    list1 = List.objects.create(name='List 1', owner=user)
    list2 = List.objects.create(name='List 2', owner=user)
    list3 = List.objects.create(name='List 3', owner=user)

    # Add same item to 2 lists
    content_item = ContentItem.objects.create(title='The Matrix')
    ListItem.objects.create(list=list1, content_item=content_item)
    ListItem.objects.create(list=list2, content_item=content_item)

    # Check endpoint
    response = self.client.get(f'/api/content/{content_item.id}/in-lists/?user_id={user.id}')

    assert response.status_code == 200
    assert response.data['count'] == 2
    assert len(response.data['in_lists']) == 2
```

---

### BE-2.5-02: Request Retry Logic (External APIs)
**Priority:** 🟡 HIGH
**Estimate:** 2 days
**Owner:** _Assign_
**Frontend Impact:** Reduced errors from transient API failures

**Current Issue:**
When external APIs (TMDB, IGDB, Spotify) have transient failures, requests fail immediately. No retry logic.

**Solution:**
Implement exponential backoff retry logic for external API calls.

**Implementation:**
```python
# lib/external_api/retry.py
import time
from functools import wraps
from typing import Callable, Any

class RetryConfig:
    MAX_RETRIES = 3
    BASE_DELAY = 1  # seconds
    MAX_DELAY = 16  # seconds
    EXPONENTIAL_BASE = 2

def retry_with_backoff(
    max_retries: int = RetryConfig.MAX_RETRIES,
    base_delay: float = RetryConfig.BASE_DELAY,
    max_delay: float = RetryConfig.MAX_DELAY,
    retryable_exceptions: tuple = (requests.exceptions.RequestException,)
):
    """
    Decorator to retry a function with exponential backoff.

    Retry delays: 1s, 2s, 4s, 8s, 16s (capped at max_delay)
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            retries = 0
            while retries < max_retries:
                try:
                    return func(*args, **kwargs)
                except retryable_exceptions as e:
                    retries += 1
                    if retries >= max_retries:
                        # Final failure - re-raise exception
                        logger.error(f"Max retries ({max_retries}) exceeded for {func.__name__}")
                        raise

                    # Calculate delay with exponential backoff
                    delay = min(base_delay * (RetryConfig.EXPONENTIAL_BASE ** (retries - 1)), max_delay)

                    logger.warning(
                        f"Retry {retries}/{max_retries} for {func.__name__} after {delay}s delay. "
                        f"Error: {str(e)}"
                    )

                    time.sleep(delay)

            return None  # Should never reach here

        return wrapper
    return decorator
```

**Usage:**
```python
# lib/external_api/tmdb.py
from .retry import retry_with_backoff

@retry_with_backoff(max_retries=3, base_delay=1)
def fetch_movie_details(movie_id: str):
    response = requests.get(
        f'{TMDB_BASE_URL}/movie/{movie_id}',
        params={'api_key': TMDB_API_KEY},
        timeout=10
    )
    response.raise_for_status()
    return response.json()

# lib/external_api/igdb.py
@retry_with_backoff(max_retries=3, base_delay=2)
def fetch_game_details(game_id: str):
    response = requests.post(
        f'{IGDB_BASE_URL}/games',
        headers={...},
        data=f'fields *; where id = {game_id};',
        timeout=10
    )
    response.raise_for_status()
    return response.json()
```

**Retry Only on Transient Errors:**
```python
# Only retry on:
# - Network errors (connection timeout, DNS)
# - 5xx server errors (502, 503, 504)
# - 429 Too Many Requests (rate limiting)

# Do NOT retry on:
# - 4xx client errors (400, 401, 403, 404) - these won't succeed on retry
# - Successful responses (2xx)

def is_retryable_error(exception):
    if isinstance(exception, requests.exceptions.Timeout):
        return True
    if isinstance(exception, requests.exceptions.ConnectionError):
        return True
    if hasattr(exception, 'response') and exception.response is not None:
        status_code = exception.response.status_code
        return status_code in [429, 500, 502, 503, 504]
    return False

@retry_with_backoff(retryable_exceptions=(requests.exceptions.RequestException,))
def fetch_with_smart_retry(url: str):
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        if not is_retryable_error(e):
            raise  # Don't retry 4xx errors
        raise  # Retry transient errors
```

**Acceptance Criteria:**
- [ ] Retries external API calls on transient failures
- [ ] Exponential backoff: 1s, 2s, 4s, 8s, 16s
- [ ] Max 3 retries by default
- [ ] Only retries on 5xx, 429, network errors
- [ ] Does NOT retry on 4xx errors
- [ ] Logs retry attempts
- [ ] Applied to all external API integrations:
  - [ ] TMDB (movies, TV)
  - [ ] IGDB (games)
  - [ ] Spotify (music)
  - [ ] OpenLibrary (books)
- [ ] Tests for retry logic:
  - [ ] Success on first try → no retry
  - [ ] Failure → retry → success
  - [ ] 3 failures → final exception
  - [ ] Non-retryable error → immediate failure

**Testing:**
```python
# tests/test_retry_logic.py
from unittest.mock import patch, MagicMock
import requests

def test_retry_succeeds_on_second_attempt():
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {'data': 'success'}

    with patch('requests.get') as mock_get:
        # First call fails, second succeeds
        mock_get.side_effect = [
            requests.exceptions.Timeout(),
            mock_response
        ]

        result = fetch_movie_details('123')

        assert mock_get.call_count == 2  # 1 failure + 1 success
        assert result == {'data': 'success'}

def test_retry_fails_after_max_retries():
    with patch('requests.get') as mock_get:
        mock_get.side_effect = requests.exceptions.Timeout()

        with pytest.raises(requests.exceptions.Timeout):
            fetch_movie_details('123')

        assert mock_get.call_count == 3  # Max retries

def test_no_retry_on_404():
    mock_response = MagicMock()
    mock_response.status_code = 404
    mock_response.raise_for_status.side_effect = requests.exceptions.HTTPError()

    with patch('requests.get') as mock_get:
        mock_get.return_value = mock_response

        with pytest.raises(requests.exceptions.HTTPError):
            fetch_movie_details('invalid-id')

        assert mock_get.call_count == 1  # No retry on 404
```

---

### BE-2.5-03: Elevate Release Date Filtering (from BE-205)
**Priority:** 🟡 HIGH (Upgraded from 🟢 MEDIUM)
**Estimate:** 2 days
**Owner:** _Assign_
**Frontend Impact:** Cleaner search results, no unreleased content

**Action:** Move BE-205 from Sprint 2 to Sprint 2.5 and upgrade priority to HIGH.

**Full Specification:** See `docs/PHASE_1_MVP_SPRINT_2/BACKEND.md` lines 320-386

**Summary:**
Filter out content with:
- `release_date` > (today + 1 day)  // 1-day timezone margin
- `release_date` is null

**Affected Endpoints:**
- `GET /api/content/search/`
- `GET /api/content/movies/`
- `GET /api/content/tv/`
- `GET /api/content/games/`
- `GET /api/content/music/`
- `GET /api/content/books/`

**Optional Query Parameter:**
```
GET /api/content/search/?q=inception&include_unreleased=true
```

**Acceptance Criteria:**
- [ ] Filters null release dates
- [ ] Filters future releases (1-day margin)
- [ ] Optional parameter to disable filter
- [ ] Works for all content types
- [ ] TV shows filtered by series date (not episode dates)
- [ ] Tests for edge cases
- [ ] API documentation updated

---

## 🟢 MEDIUM PRIORITY Tasks

### BE-2.5-04: Homepage Random Items
**Priority:** 🟢 MEDIUM
**Estimate:** 1 day
**Owner:** _Assign_
**Frontend Impact:** Homepage shows different items on each visit

**Current Behavior:**
```
GET /api/lists/?items_size=6
```
Returns first 6 items from each list (always the same).

**New Behavior:**
```
GET /api/lists/?items_size=6&random=true
```
Returns 6 random items from each list.

**Implementation:**
```python
# views/lists.py
from django.db.models import Q
from random import sample

class ListViewSet(viewsets.ModelViewSet):
    def list(self, request):
        items_size = int(request.query_params.get('items_size', 10))
        random = request.query_params.get('random', 'false').lower() == 'true'

        lists = List.objects.filter(
            Q(owner=request.user) | Q(members=request.user)
        ).distinct()

        # Serialize lists
        serialized = []
        for list_obj in lists:
            list_data = ListSerializer(list_obj).data

            # Get items
            if random:
                # Get random sample
                all_items = list(ListItem.objects.filter(list=list_obj))
                if len(all_items) > items_size:
                    random_items = sample(all_items, items_size)
                else:
                    random_items = all_items
                list_data['items'] = ListItemSerializer(random_items, many=True).data
            else:
                # Get first N items (current behavior)
                items = ListItem.objects.filter(list=list_obj)[:items_size]
                list_data['items'] = ListItemSerializer(items, many=True).data

            serialized.append(list_data)

        return Response({'results': serialized})
```

**Alternative (Database-level randomization):**
```python
# More efficient for large datasets
if random:
    items = ListItem.objects.filter(list=list_obj).order_by('?')[:items_size]
else:
    items = ListItem.objects.filter(list=list_obj)[:items_size]
```

**Acceptance Criteria:**
- [ ] `random=true` returns random sample
- [ ] `random=false` returns first N items (current behavior)
- [ ] Random seed different per request
- [ ] Performance acceptable (<500ms)
- [ ] Works for lists with <N items (returns all)
- [ ] Works for empty lists (returns empty array)
- [ ] API documentation updated
- [ ] Tests:
  - [ ] random=true → different items each call
  - [ ] random=false → same items each call
  - [ ] List with 3 items, items_size=6 → returns 3 items

---

### BE-2.5-05: Search Caching (Lowercase)
**Priority:** 🟢 LOW (Performance optimization)
**Estimate:** 2 days
**Owner:** _Assign_
**Frontend Impact:** Faster search responses

**Current Issue:**
Searches are case-sensitive at cache level:
- "Inception" → cache miss
- "inception" → cache miss
- "INCEPTION" → cache miss

All three queries hit the database/external APIs separately.

**Solution:**
Normalize search queries to lowercase before caching.

**Implementation:**
```python
# lib/cache/search_cache.py
from django.core.cache import cache
from typing import Optional, Dict, Any
import hashlib

SEARCH_CACHE_TTL = 300  # 5 minutes

def get_search_cache_key(query: str, content_type: str, **filters) -> str:
    """
    Generate cache key for search query.
    Normalizes query to lowercase for consistent caching.
    """
    normalized_query = query.lower().strip()

    # Include filters in cache key
    filter_str = ''.join(f'{k}={v}' for k, v in sorted(filters.items()))

    # Hash for consistent key length
    key_data = f'search:{content_type}:{normalized_query}:{filter_str}'
    key_hash = hashlib.md5(key_data.encode()).hexdigest()

    return f'search:{content_type}:{key_hash}'

def get_cached_search(query: str, content_type: str, **filters) -> Optional[Dict[str, Any]]:
    """Get cached search results."""
    cache_key = get_search_cache_key(query, content_type, **filters)
    return cache.get(cache_key)

def set_cached_search(query: str, content_type: str, results: Dict[str, Any], **filters):
    """Cache search results."""
    cache_key = get_search_cache_key(query, content_type, **filters)
    cache.set(cache_key, results, SEARCH_CACHE_TTL)
```

**Usage:**
```python
# views/search.py
from lib.cache.search_cache import get_cached_search, set_cached_search

def search_content(request):
    query = request.query_params.get('q', '')
    content_type = request.query_params.get('type', 'MOVIE')

    # Check cache first
    cached_results = get_cached_search(query, content_type)
    if cached_results:
        return Response(cached_results)

    # Cache miss - fetch from external API
    results = fetch_from_external_api(query, content_type)

    # Cache results
    set_cached_search(query, content_type, results)

    return Response(results)
```

**Cache Invalidation:**
```python
# When should cache be cleared?
# 1. Manual invalidation endpoint (admin only)
# 2. Time-based expiration (5-15 minutes)
# 3. Never - search results are read-only from external APIs

# For user-specific searches (e.g., filtering by user's lists), include user_id in cache key
cache_key = f'search:{content_type}:{normalized_query}:user:{user_id}'
```

**Acceptance Criteria:**
- [ ] Search queries cached for 5 minutes
- [ ] Case-insensitive caching ("Inception" == "inception")
- [ ] Whitespace normalized (trim)
- [ ] Different content types cached separately
- [ ] Cache hit rate >70% in production
- [ ] Cache miss time <1s (external API call)
- [ ] Cache hit time <50ms
- [ ] API documentation updated
- [ ] Tests:
  - [ ] Same query (different case) → cache hit
  - [ ] Different query → cache miss
  - [ ] Cache expiration after TTL
  - [ ] Cache key includes filters

**Performance Testing:**
```python
# tests/test_search_cache.py
import time

def test_cache_performance():
    # First call - cache miss
    start = time.time()
    response1 = client.get('/api/content/search/?q=inception')
    duration1 = time.time() - start

    # Second call - cache hit
    start = time.time()
    response2 = client.get('/api/content/search/?q=Inception')  # Different case
    duration2 = time.time() - start

    assert response1.data == response2.data  # Same results
    assert duration2 < duration1 * 0.2  # Cache hit at least 5x faster
```

**Cache Monitoring:**
```python
# Add logging for cache hit/miss rates
import logging

logger = logging.getLogger(__name__)

def get_cached_search(query: str, content_type: str, **filters):
    cache_key = get_search_cache_key(query, content_type, **filters)
    result = cache.get(cache_key)

    if result:
        logger.info(f'Cache HIT: {cache_key}')
    else:
        logger.info(f'Cache MISS: {cache_key}')

    return result
```

---

## ✅ Definition of Done

A task is complete when:
- [ ] Code implemented and tested
- [ ] Unit tests written (80%+ coverage)
- [ ] Integration tests passing
- [ ] Performance benchmarks met (where applicable)
- [ ] API documentation updated (Swagger/Postman)
- [ ] Code reviewed by 1+ teammate
- [ ] Deployed to staging
- [ ] Frontend team notified
- [ ] No regressions in existing functionality

---

## Sprint 2.5 Backend Summary

**High Priority:** 3 tasks (6 days)
**Medium Priority:** 1 task (1 day)
**Low Priority:** 1 task (2 days)

**Total Estimated:** 9 days → **2 weeks with 1 backend developer**

**Recommended Focus:**
- Week 1: Complete all HIGH priority tasks (BE-2.5-01, BE-2.5-02, BE-2.5-03)
- Week 2: Complete MEDIUM and LOW tasks

---

## Dependencies for Frontend

**Frontend Tasks Blocked by Backend:**
- FE-2.5-05 → Requires BE-2.5-01 (Check item in lists endpoint)
- FE-2.5-08 → Requires BE-2.5-04 (Random items endpoint)

**Recommended Coordination:**
- Complete BE-2.5-01 by end of Week 1 (unblocks FE-2.5-05)
- Complete BE-2.5-04 by mid Week 2 (unblocks FE-2.5-08)

---

**Last Updated:** 2025-11-15
**Status:** NEW SPRINT - Insert between Sprint 2 and Sprint 3
**Next Steps:** Review and approve scope with backend team
