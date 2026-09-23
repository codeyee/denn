"""Text-only moderation state construction (JEV-002A).

The builder produces the exact JSON state sent to Jev: named text fields
only (provider, content type, title, description, genres, tags), always
fail-safe to empty values and canonical ordering so identical inputs hash
identically.
"""


class ModerationStateError(ValueError):
    """A moderation-state input was missing or not plain text."""


STATE_FIELDS = ("provider", "content_type", "title", "description", "genres", "tags")


def _require_non_empty(value, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ModerationStateError(f"{field} must be a non-empty text value")
    return " ".join(value.split())


def _normalize_text(value) -> str:
    if value is None:
        return ""
    if not isinstance(value, str):
        raise ModerationStateError(f"title/description must be text, got {type(value).__name__}")
    return " ".join(value.split())


def _normalize_names(values, field: str) -> list[str]:
    if values is None:
        return []
    if isinstance(values, (str, bytes)) or not hasattr(values, "__iter__"):
        raise ModerationStateError(f"{field} must be a sequence of text values")
    normalized = []
    for raw in values:
        if not isinstance(raw, str):
            raise ModerationStateError(f"{field} entries must be text, got {type(raw).__name__}")
        cleaned = " ".join(raw.split())
        if cleaned:
            normalized.append(cleaned)
    return sorted(set(normalized))


def build_moderation_state(
    *,
    provider,
    content_type,
    title=None,
    description=None,
    genres=None,
    tags=None,
) -> dict:
    """Build the JSON state consumed by the moderation questions."""
    return {
        "provider": _require_non_empty(provider, "provider"),
        "content_type": _require_non_empty(content_type, "content_type"),
        "title": _normalize_text(title),
        "description": _normalize_text(description),
        "genres": _normalize_names(genres, "genres"),
        "tags": _normalize_names(tags, "tags"),
    }
