"""Business rules for keeping game completion-time estimates usable."""
from __future__ import annotations

from typing import Any, Dict, Mapping, Optional


MAX_GAME_DURATION_HOURS = 3000
MAX_GAME_DURATION_SECONDS = MAX_GAME_DURATION_HOURS * 60 * 60
GAME_DURATION_FIELDS = (
    'hastily_seconds',
    'normally_seconds',
    'completely_seconds',
)


def normalize_game_duration_values(duration: Mapping[str, Any]) -> Dict[str, Optional[int]]:
    """Drop impossible values and reject contradictory ordered estimates."""
    normalized: Dict[str, Optional[int]] = {}
    previous: Optional[int] = None

    for field in GAME_DURATION_FIELDS:
        value = duration.get(field)
        if (
            isinstance(value, int)
            and not isinstance(value, bool)
            and 0 < value <= MAX_GAME_DURATION_SECONDS
        ):
            if previous is not None and value < previous:
                return {name: None for name in GAME_DURATION_FIELDS}
            normalized[field] = value
            previous = value
        else:
            normalized[field] = None

    return normalized


def normalized_game_duration_status(
    source_status: Any,
    values: Mapping[str, Optional[int]],
) -> str:
    """Return a safe status after applying the duration data rules."""
    if source_status == 'error':
        return 'error'
    if any(value is not None for value in values.values()):
        return source_status if source_status in {'matched', 'stale'} else 'matched'
    return 'no_data'
