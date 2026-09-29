"""Defensive sanitizers for provider safety metadata.

The proxy contract adds optional safety fields to detail payloads. Detail writes
must never fail because one of them is malformed, so these helpers drop
anything that does not have the expected shape instead of raising. A missing or
unusable field becomes `None` / an empty list, which reads as "unknown" and
never as safe. Semantics live in `moderation_service`, not here.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

MAX_GENRES = 100
MAX_KEYWORDS = 100
MAX_SUBJECTS = 50
MAX_CERTIFICATIONS = 100
MAX_AGE_RATINGS = 20
MAX_DESCRIPTORS = 20


def clean_optional_bool(value: Any) -> Optional[bool]:
    """Return a real bool, or None for anything else (including 0/1 and strings)."""
    return value if isinstance(value, bool) else None


def clean_text_list(value: Any, *, limit: int) -> List[str]:
    """Trim, drop non-text and empty entries, dedupe in order, and cap at `limit`."""
    if not isinstance(value, list):
        return []
    cleaned: List[str] = []
    seen = set()
    for entry in value:
        if not isinstance(entry, str):
            continue
        text = entry.strip()
        if not text or text in seen:
            continue
        seen.add(text)
        cleaned.append(text)
        if len(cleaned) == limit:
            break
    return cleaned


def clean_certifications(value: Any, *, limit: int = MAX_CERTIFICATIONS) -> List[Dict[str, str]]:
    """Keep `{country, rating}` entries whose values are non-empty text."""
    if not isinstance(value, list):
        return []
    cleaned: List[Dict[str, str]] = []
    seen = set()
    for entry in value:
        if not isinstance(entry, dict):
            continue
        country, rating = entry.get('country'), entry.get('rating')
        if not isinstance(country, str) or not isinstance(rating, str):
            continue
        key = (country.strip(), rating.strip())
        if not all(key) or key in seen:
            continue
        seen.add(key)
        cleaned.append({'country': key[0], 'rating': key[1]})
        if len(cleaned) == limit:
            break
    return cleaned


def clean_age_ratings(value: Any, *, limit: int = MAX_AGE_RATINGS) -> List[Dict[str, Any]]:
    """Keep `{organization, rating, descriptors}` entries; descriptors may be empty."""
    if not isinstance(value, list):
        return []
    cleaned: List[Dict[str, Any]] = []
    seen = set()
    for entry in value:
        if not isinstance(entry, dict):
            continue
        organization, rating = entry.get('organization'), entry.get('rating')
        if not isinstance(organization, str) or not isinstance(rating, str):
            continue
        organization, rating = organization.strip(), rating.strip()
        if not organization or not rating:
            continue
        descriptors = clean_text_list(entry.get('descriptors'), limit=MAX_DESCRIPTORS)
        key = (organization, rating, tuple(descriptors))
        if key in seen:
            continue
        seen.add(key)
        cleaned.append({
            'organization': organization,
            'rating': rating,
            'descriptors': descriptors,
        })
        if len(cleaned) == limit:
            break
    return cleaned
