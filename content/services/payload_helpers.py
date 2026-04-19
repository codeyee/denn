"""Shared helpers for working with the proxy's normalized payload.

These were originally defined in `browse_metadata_service` and are now
also consumed by the per-type mappers in `local_content_store.mappers`.
Keeping them in a leaf module avoids a circular import between the two
service packages.
"""
from __future__ import annotations

import hashlib
import json
from datetime import date, datetime
from typing import Any, Dict, List, Optional


def parse_iso_date(value: Any) -> Optional[date]:
    """Parse `YYYY-MM-DD`, `YYYY-MM`, or `YYYY` strings into a `date`."""
    if not value or not isinstance(value, str):
        return None
    for fmt in ('%Y-%m-%d', '%Y-%m', '%Y'):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None


def authors_of_type(payload: Dict[str, Any], wanted: str) -> List[str]:
    """Return author names whose proxy `type` matches `wanted`."""
    out: List[str] = []
    raw = payload.get('authors')
    if not isinstance(raw, list):
        return out
    for entry in raw:
        if isinstance(entry, dict) and entry.get('type') == wanted and entry.get('name'):
            out.append(str(entry['name']))
        elif isinstance(entry, str):
            out.append(entry)
    return out


def normalized_title(payload: Dict[str, Any]) -> str:
    """Return the proxy's normalized display title with sensible fallbacks."""
    return (
        payload.get('title')
        or payload.get('original_title')
        or payload.get('tv_show_name')
        or ''
    ).strip()


def hash_payload(payload: Any) -> str:
    """Stable sha256 of any JSON-serializable subset of the proxy payload."""
    try:
        canonical = json.dumps(payload, sort_keys=True, default=str)
    except Exception:
        return ''
    return hashlib.sha256(canonical.encode('utf-8')).hexdigest()
