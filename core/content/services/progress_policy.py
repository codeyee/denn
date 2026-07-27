from dataclasses import dataclass

from content.models import ContentItem, UserContentTracking


@dataclass(frozen=True)
class ProgressState:
    value: str
    label: str
    is_final: bool = False


_STATE_LABELS = {
    UserContentTracking.Status.BACKLOG: "Plan to consume",
    UserContentTracking.Status.IN_PROGRESS: "In progress",
    UserContentTracking.Status.COMPLETED: "Completed",
    UserContentTracking.Status.ON_HOLD: "On hold",
    UserContentTracking.Status.DROPPED: "Dropped",
}

_SUPPORTED_STATES = {
    ContentItem.ContentType.MOVIE: (
        UserContentTracking.Status.BACKLOG,
        UserContentTracking.Status.IN_PROGRESS,
        UserContentTracking.Status.DROPPED,
        UserContentTracking.Status.COMPLETED,
    ),
    ContentItem.ContentType.TV_SHOW: (
        UserContentTracking.Status.BACKLOG,
        UserContentTracking.Status.IN_PROGRESS,
        UserContentTracking.Status.ON_HOLD,
        UserContentTracking.Status.DROPPED,
        UserContentTracking.Status.COMPLETED,
    ),
    ContentItem.ContentType.SEASON: (
        UserContentTracking.Status.BACKLOG,
        UserContentTracking.Status.IN_PROGRESS,
        UserContentTracking.Status.ON_HOLD,
        UserContentTracking.Status.DROPPED,
        UserContentTracking.Status.COMPLETED,
    ),
    ContentItem.ContentType.BOOK: (
        UserContentTracking.Status.BACKLOG,
        UserContentTracking.Status.IN_PROGRESS,
        UserContentTracking.Status.ON_HOLD,
        UserContentTracking.Status.DROPPED,
        UserContentTracking.Status.COMPLETED,
    ),
    ContentItem.ContentType.GAME: (
        UserContentTracking.Status.BACKLOG,
        UserContentTracking.Status.IN_PROGRESS,
        UserContentTracking.Status.ON_HOLD,
        UserContentTracking.Status.DROPPED,
        UserContentTracking.Status.COMPLETED,
    ),
    ContentItem.ContentType.ALBUM: (
        UserContentTracking.Status.BACKLOG,
        UserContentTracking.Status.IN_PROGRESS,
        UserContentTracking.Status.COMPLETED,
    ),
}

_TYPE_LABEL_OVERRIDES = {
    ContentItem.ContentType.MOVIE: {
        UserContentTracking.Status.BACKLOG: "Plan to watch",
        UserContentTracking.Status.IN_PROGRESS: "Watching",
        UserContentTracking.Status.COMPLETED: "Watched",
    },
    ContentItem.ContentType.TV_SHOW: {
        UserContentTracking.Status.BACKLOG: "Plan to watch",
        UserContentTracking.Status.IN_PROGRESS: "Watching",
        UserContentTracking.Status.COMPLETED: "Watched",
    },
    ContentItem.ContentType.SEASON: {
        UserContentTracking.Status.BACKLOG: "Plan to watch",
        UserContentTracking.Status.IN_PROGRESS: "Watching",
        UserContentTracking.Status.COMPLETED: "Watched",
    },
    ContentItem.ContentType.BOOK: {
        UserContentTracking.Status.BACKLOG: "Plan to read",
        UserContentTracking.Status.IN_PROGRESS: "Reading",
        UserContentTracking.Status.COMPLETED: "Read",
    },
    ContentItem.ContentType.GAME: {
        UserContentTracking.Status.BACKLOG: "Plan to play",
        UserContentTracking.Status.IN_PROGRESS: "Playing",
        UserContentTracking.Status.COMPLETED: "Played",
    },
    ContentItem.ContentType.ALBUM: {
        UserContentTracking.Status.BACKLOG: "Plan to listen",
        UserContentTracking.Status.IN_PROGRESS: "Listening",
        UserContentTracking.Status.COMPLETED: "Listened",
    },
}


def get_progress_policy(content_type: str) -> dict:
    supported = _SUPPORTED_STATES.get(content_type, ())
    labels = _TYPE_LABEL_OVERRIDES.get(content_type, {})
    return {
        "content_type": content_type,
        "final_status": UserContentTracking.Status.COMPLETED,
        "states": [
            {
                "value": state,
                "label": labels.get(state, _STATE_LABELS[state]),
                "is_final": state == UserContentTracking.Status.COMPLETED,
            }
            for state in supported
        ],
    }


def is_status_supported(content_type: str, status: str) -> bool:
    return status in _SUPPORTED_STATES.get(content_type, ())
