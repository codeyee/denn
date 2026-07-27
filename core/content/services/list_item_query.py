"""
Query model for list item exploration.

Parses query params into a structured `ListItemQuery` and provides
helpers to apply filters/sort/group_by to a queryset using whitelists.

Convention:
- filter[<field>]=value         (csv supported for multi-value)
- sort=field,-other_field       (csv with `-` for desc; multi-field in priority order)
- group_by=<field>              (single field in v1)

Whitelisted fields are mapped to ORM lookups so the rest of the codebase
can rely on a stable contract and we never expose arbitrary SQL.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

from django.db.models import QuerySet


# --------- whitelists ---------

# field -> ORM lookup (filter side)
ALLOWED_FILTERS: Dict[str, str] = {
    'context_status': 'context_status',
    'content_type': 'content_item__content_type',
    'source_api': 'content_item__source_api',
    'added_by': 'added_by_id',
}

# range filters: field -> (orm_lookup, transform)
RANGE_FILTERS: Dict[str, Tuple[str, str]] = {
    # 'list_rating_gte' will operate on the annotated avg
    'list_rating_gte': ('member_rating_avg_annotated__gte', 'float'),
    'list_rating_lte': ('member_rating_avg_annotated__lte', 'float'),
    'added_at_gte': ('added_at__gte', 'datetime'),
    'added_at_lte': ('added_at__lte', 'datetime'),
    'context_completed_at_gte': ('context_completed_at__gte', 'datetime'),
    'context_completed_at_lte': ('context_completed_at__lte', 'datetime'),
    'release_date_gte': ('content_item__browse_meta__release_date__gte', 'date'),
    'release_date_lte': ('content_item__browse_meta__release_date__lte', 'date'),
}

# field -> ORM order_by expression (sort side)
ALLOWED_SORTS: Dict[str, str] = {
    'list_order': 'list_order',
    'added_at': 'added_at',
    'context_completed_at': 'context_completed_at',
    'context_status': 'context_status',
    'content_type': 'content_item__content_type',
    'list_rating': 'member_rating_avg_annotated',
    'display_title': 'content_item__browse_meta__display_title',
    'artist': 'content_item__browse_meta__artist',
    'album_title': 'content_item__browse_meta__album_title',
    'release_date': 'content_item__browse_meta__release_date',
}

# field -> grouping config (orm field, label_resolver_name)
ALLOWED_GROUPS: Dict[str, str] = {
    'context_status': 'context_status',
    'content_type': 'content_item__content_type',
    'source_api': 'content_item__source_api',
    'added_by': 'added_by_id',
    'artist': 'content_item__browse_meta__artist',
}


@dataclass
class SortClause:
    field: str
    direction: str  # 'asc' or 'desc'

    @property
    def orm(self) -> str:
        col = ALLOWED_SORTS[self.field]
        return col if self.direction == 'asc' else f'-{col}'


@dataclass
class ListItemQuery:
    filters: Dict[str, Any] = field(default_factory=dict)
    range_filters: Dict[str, Any] = field(default_factory=dict)
    sort: List[SortClause] = field(default_factory=list)
    group_by: Optional[str] = None

    @property
    def has_filters(self) -> bool:
        return bool(self.filters) or bool(self.range_filters)

    @property
    def has_grouping(self) -> bool:
        return self.group_by is not None


class QueryParseError(Exception):
    """Raised when a query param fails whitelist validation."""


def _coerce(value: str, kind: str) -> Any:
    if kind == 'float':
        try:
            return float(value)
        except (TypeError, ValueError):
            raise QueryParseError(f'Invalid number: {value!r}')
    if kind in ('date', 'datetime'):
        # Let Django parse dates/datetimes via lookups; pass-through string.
        return value
    return value


def parse_list_item_query(query_params) -> ListItemQuery:
    """
    Build a `ListItemQuery` from a request's QueryDict-like object.

    Recognized params:
      filter[<field>]    csv supported for IN-style filtering
      filter_<field>     legacy alternative (only documented as fallback)
      sort               csv, prefix `-` for desc
      group_by           single field
    """
    filters: Dict[str, Any] = {}
    range_filters: Dict[str, Any] = {}

    for raw_key in query_params.keys():
        if raw_key.startswith('filter[') and raw_key.endswith(']'):
            field_name = raw_key[len('filter['):-1]
            raw_value = query_params.get(raw_key, '')
            if raw_value == '':
                continue

            if field_name in ALLOWED_FILTERS:
                values = [v.strip() for v in raw_value.split(',') if v.strip()]
                if not values:
                    continue
                lookup = ALLOWED_FILTERS[field_name]
                if len(values) == 1:
                    filters[lookup] = values[0]
                else:
                    filters[f'{lookup}__in'] = values
            elif field_name in RANGE_FILTERS:
                lookup, kind = RANGE_FILTERS[field_name]
                range_filters[lookup] = _coerce(raw_value, kind)
            else:
                raise QueryParseError(f'Unknown filter field: {field_name!r}')

    sort_param = query_params.get('sort', '').strip()
    sort: List[SortClause] = []
    if sort_param:
        for token in sort_param.split(','):
            token = token.strip()
            if not token:
                continue
            direction = 'asc'
            if token.startswith('-'):
                direction = 'desc'
                token = token[1:]
            if token not in ALLOWED_SORTS:
                raise QueryParseError(f'Unknown sort field: {token!r}')
            sort.append(SortClause(field=token, direction=direction))

    group_by = query_params.get('group_by', '').strip() or None
    if group_by and group_by not in ALLOWED_GROUPS:
        raise QueryParseError(f'Unknown group_by field: {group_by!r}')

    return ListItemQuery(
        filters=filters,
        range_filters=range_filters,
        sort=sort,
        group_by=group_by,
    )


def apply_query(queryset: QuerySet, query: ListItemQuery) -> QuerySet:
    """Apply filters, sort and grouping pre-order to a list-item queryset."""
    if query.filters:
        queryset = queryset.filter(**query.filters)
    if query.range_filters:
        queryset = queryset.filter(**query.range_filters)

    if query.sort:
        order_args = [clause.orm for clause in query.sort]
        # Always include canonical tiebreakers for stability.
        order_args.extend(['list_order', '-added_at'])
        queryset = queryset.order_by(*order_args)
    elif query.group_by:
        # Group by first to keep grouped items contiguous, then by canonical order.
        group_orm = ALLOWED_GROUPS[query.group_by]
        queryset = queryset.order_by(group_orm, 'list_order', '-added_at')

    return queryset


# --------- group header builder ---------

GROUP_LABELS: Dict[str, Dict[str, str]] = {
    'context_status': {
        'PENDING': 'Pending',
        'COMPLETED': 'Completed',
    },
    'content_type': {
        'MOVIE': 'Movies',
        'TV_SHOW': 'TV Shows',
        'SEASON': 'Seasons',
        'ALBUM': 'Albums',
        'GAME': 'Games',
        'BOOK': 'Books',
    },
    'source_api': {
        'tmdb': 'TMDB',
        'spotify': 'Spotify',
        'igdb': 'IGDB',
        'openlibrary': 'OpenLibrary',
    },
}


def _resolve_group_key(item, group_by: str) -> Optional[str]:
    if group_by == 'context_status':
        return item.context_status
    if group_by == 'content_type':
        return item.content_item.content_type
    if group_by == 'source_api':
        return item.content_item.source_api
    if group_by == 'added_by':
        return str(item.added_by_id) if item.added_by_id else None
    if group_by == 'artist':
        meta = getattr(item.content_item, 'browse_meta', None)
        return getattr(meta, 'artist', None) if meta else None
    return None


def build_group_metadata(items_in_page: List[Any], full_queryset: QuerySet, group_by: str) -> List[Dict[str, Any]]:
    """
    Build group headers for the visible page.

    Returns a list of {key, label, count_in_page, count_global} dicts in
    the order the groups first appear in the page.
    """
    if not group_by:
        return []

    from django.db.models import Count
    orm_field = ALLOWED_GROUPS[group_by]
    global_counts: Dict[Optional[str], int] = {
        row[orm_field]: row['count']
        for row in full_queryset.values(orm_field).order_by().annotate(count=Count('id'))
    }

    groups: List[Dict[str, Any]] = []
    seen: Dict[Optional[str], int] = {}
    page_counts: Dict[Optional[str], int] = {}
    order: List[Optional[str]] = []
    for item in items_in_page:
        key = _resolve_group_key(item, group_by)
        if key not in seen:
            seen[key] = len(order)
            order.append(key)
            page_counts[key] = 0
        page_counts[key] += 1

    for key in order:
        label_map = GROUP_LABELS.get(group_by, {})
        label = label_map.get(key, '' if key is None else str(key)) if key is not None else 'Sin valor'
        groups.append({
            'key': '' if key is None else str(key),
            'label': label,
            'count_in_page': page_counts[key],
            'count_global': global_counts.get(key, 0),
        })

    return groups
