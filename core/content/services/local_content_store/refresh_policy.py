from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from django.conf import settings
from django.db.models import Case, DateTimeField, DurationField, ExpressionWrapper
from django.db.models import F, Q, Value, When
from django.db.models.functions import Now
from django.utils import timezone

from content.models import ContentItem


@dataclass(frozen=True)
class RefreshPolicy:
    ttl: timedelta
    age_band: str
    reason: str
    age_days: Optional[int]


DEFAULT_POLICY = {
    "BANDS": [
        {"name": "pre_release", "max_age_days": -1, "ttl_days": 1},
        {"name": "hot", "max_age_days": 29, "ttl_days": 2},
        {"name": "recent", "max_age_days": 179, "ttl_days": 7},
        {"name": "first_year", "max_age_days": 364, "ttl_days": 14},
        {"name": "stable", "max_age_days": 1094, "ttl_days": 30},
        {"name": "aged", "max_age_days": 3649, "ttl_days": 90},
        {"name": "classic", "max_age_days": None, "ttl_days": 180},
    ],
    "UNKNOWN_TTL_DAYS": 30,
    "TYPE_OVERRIDES": {
        "BOOK": {"multiplier": 2.0, "classic_ttl_days": 365},
        "ALBUM": {"classic_ttl_days": 365},
        "TV_SHOW": {
            "active_statuses": ["returning series", "in production"],
            "active_ttl_days": 2,
            "active_band": "hot",
        },
    },
}

DETAIL_RELATED_NAME = {
    ContentItem.ContentType.MOVIE: "movie_detail",
    ContentItem.ContentType.TV_SHOW: "tv_show_detail",
    ContentItem.ContentType.SEASON: "season_detail",
    ContentItem.ContentType.ALBUM: "album_detail",
    ContentItem.ContentType.GAME: "game_detail",
    ContentItem.ContentType.BOOK: "book_detail",
}


def get_refresh_policy_settings() -> Dict[str, Any]:
    config = getattr(settings, "CONTENT_REHYDRATION_POLICY", None)
    if not config:
        return DEFAULT_POLICY
    return config


def compute_refresh_policy(
    content_item: ContentItem,
    detail: Optional[Any],
    *,
    now: Optional[datetime] = None,
) -> RefreshPolicy:
    config = get_refresh_policy_settings()
    now = now or timezone.now()

    release_date = getattr(detail, "release_date", None) if detail is not None else None
    status = (getattr(detail, "status", "") or "").strip().lower()

    if release_date is None:
        ttl = timedelta(days=int(config["UNKNOWN_TTL_DAYS"]))
        ttl = _apply_post_band_overrides(content_item.content_type, "unknown", ttl, config)
        return RefreshPolicy(
            ttl=ttl,
            age_band="unknown",
            reason="missing_release_date",
            age_days=None,
        )

    if isinstance(release_date, datetime):
        release_date = release_date.date()

    age_days = (now.date() - release_date).days
    override = _active_status_override(content_item.content_type, status, config)
    if override is not None:
        return RefreshPolicy(
            ttl=override,
            age_band=config["TYPE_OVERRIDES"][content_item.content_type]["active_band"],
            reason=f"active_status:{status}",
            age_days=age_days,
        )

    band = _select_band(age_days, config)
    ttl = timedelta(days=int(band["ttl_days"]))
    ttl = _apply_post_band_overrides(content_item.content_type, band["name"], ttl, config)
    return RefreshPolicy(
        ttl=ttl,
        age_band=band["name"],
        reason=f"age_days:{age_days}",
        age_days=age_days,
    )


def build_refresh_due_at_expression(
    content_type: str,
    *,
    related_name: Optional[str] = None,
    ttl_override: Optional[timedelta] = None,
):
    related_name = related_name or DETAIL_RELATED_NAME[content_type]
    last_refreshed_field = F(f"{related_name}__last_refreshed_at")

    if ttl_override is not None:
        ttl_expr = Value(ttl_override, output_field=DurationField())
    else:
        ttl_expr = _build_ttl_expression(content_type, related_name)

    return ExpressionWrapper(
        last_refreshed_field + ttl_expr,
        output_field=DateTimeField(),
    )


def build_age_band_expression(content_type: str, *, related_name: Optional[str] = None):
    related_name = related_name or DETAIL_RELATED_NAME[content_type]
    release_date_field = f"{related_name}__release_date"
    status_field = f"{related_name}__status"
    config = get_refresh_policy_settings()

    whens = []
    active_statuses = _active_statuses(content_type, config)
    if active_statuses:
        whens.append(
            When(
                Q(**{f"{release_date_field}__isnull": False})
                & Q(**{f"{status_field}__isnull": False})
                & Q(**{f"{status_field}__iregex": _regex_union(active_statuses)}),
                then=Value(
                    config["TYPE_OVERRIDES"][content_type]["active_band"],
                ),
            )
        )

    whens.append(When(**{f"{release_date_field}__isnull": True}, then=Value("unknown")))
    for band in config["BANDS"]:
        condition = _band_when(release_date_field, band)
        whens.append(When(condition, then=Value(band["name"])))

    return Case(*whens, default=Value("classic"))


def _build_ttl_expression(content_type: str, related_name: str):
    config = get_refresh_policy_settings()
    release_date_field = f"{related_name}__release_date"
    status_field = f"{related_name}__status"
    whens = []

    active_statuses = _active_statuses(content_type, config)
    active_override = config["TYPE_OVERRIDES"].get(content_type, {})
    if active_statuses:
        whens.append(
            When(
                Q(**{f"{release_date_field}__isnull": False})
                & Q(**{f"{status_field}__isnull": False})
                & Q(**{f"{status_field}__iregex": _regex_union(active_statuses)}),
                then=Value(
                    timedelta(days=int(active_override["active_ttl_days"])),
                    output_field=DurationField(),
                ),
            )
        )

    whens.append(
        When(
            **{
                f"{release_date_field}__isnull": True,
            },
            then=Value(
                _apply_post_band_overrides(
                    content_type,
                    "unknown",
                    timedelta(days=int(config["UNKNOWN_TTL_DAYS"])),
                    config,
                ),
                output_field=DurationField(),
            ),
        )
    )

    for band in config["BANDS"]:
        whens.append(
            When(
                _band_when(release_date_field, band),
                then=Value(
                    _apply_post_band_overrides(
                        content_type,
                        band["name"],
                        timedelta(days=int(band["ttl_days"])),
                        config,
                    ),
                    output_field=DurationField(),
                ),
            )
        )

    return Case(
        *whens,
        default=Value(timedelta(days=180), output_field=DurationField()),
        output_field=DurationField(),
    )


def _band_when(release_date_field: str, band: Dict[str, Any]) -> Q:
    today = Now()
    max_age_days = band["max_age_days"]

    if max_age_days == -1:
        return Q(**{f"{release_date_field}__gt": today})

    if max_age_days is None:
        return Q(**{f"{release_date_field}__lte": today - timedelta(days=3650)})

    min_release_date = today - timedelta(days=max_age_days)
    if band["name"] == "hot":
        return Q(**{f"{release_date_field}__gt": today - timedelta(days=30)}) & Q(
            **{f"{release_date_field}__lte": today}
        )
    if band["name"] == "recent":
        return Q(**{f"{release_date_field}__gt": today - timedelta(days=180)}) & Q(
            **{f"{release_date_field}__lte": today - timedelta(days=30)}
        )
    if band["name"] == "first_year":
        return Q(**{f"{release_date_field}__gt": today - timedelta(days=365)}) & Q(
            **{f"{release_date_field}__lte": today - timedelta(days=180)}
        )
    if band["name"] == "stable":
        return Q(**{f"{release_date_field}__gt": today - timedelta(days=1095)}) & Q(
            **{f"{release_date_field}__lte": today - timedelta(days=365)}
        )
    if band["name"] == "aged":
        return Q(**{f"{release_date_field}__gt": today - timedelta(days=3650)}) & Q(
            **{f"{release_date_field}__lte": today - timedelta(days=1095)}
        )
    return Q(**{f"{release_date_field}__gte": min_release_date})


def _select_band(age_days: int, config: Dict[str, Any]) -> Dict[str, Any]:
    for band in config["BANDS"]:
        max_age_days = band["max_age_days"]
        if max_age_days is None or age_days <= int(max_age_days):
            return band
    return config["BANDS"][-1]


def _active_status_override(
    content_type: str,
    status: str,
    config: Dict[str, Any],
) -> Optional[timedelta]:
    active_statuses = _active_statuses(content_type, config)
    if status and status in active_statuses:
        active_ttl_days = config["TYPE_OVERRIDES"][content_type]["active_ttl_days"]
        return timedelta(days=int(active_ttl_days))
    return None


def _active_statuses(content_type: str, config: Dict[str, Any]):
    override = config["TYPE_OVERRIDES"].get(content_type, {})
    return override.get("active_statuses", [])


def _apply_post_band_overrides(
    content_type: str,
    age_band: str,
    ttl: timedelta,
    config: Dict[str, Any],
) -> timedelta:
    override = config["TYPE_OVERRIDES"].get(content_type, {})
    if age_band == "classic" and override.get("classic_ttl_days") is not None:
        ttl = timedelta(days=int(override["classic_ttl_days"]))
    multiplier = override.get("multiplier")
    if multiplier is not None:
        ttl = timedelta(days=max(1, int(ttl.days * float(multiplier))))
    return ttl


def _regex_union(values):
    return "|".join(value.replace(" ", r"\s+") for value in values)
