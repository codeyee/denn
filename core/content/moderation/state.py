"""Build the text-only moderation state from Core's local reconstruction."""
import hashlib
import json
from collections.abc import Iterable, Mapping


class ModerationStateError(ValueError):
    """A moderation-state input was missing or not plain text."""


STATE_FIELDS = (
    "provider",
    "content_type",
    "title",
    "description",
    "type_specific",
)

MAX_KEYWORDS = 40
MAX_SUBJECTS = 30
# Countries whose certifications are shown to Jev; others add noise, not signal.
CERTIFICATION_COUNTRIES = frozenset(
    {"US", "GB", "CA", "AU", "IE", "DE", "FR", "ES", "MX", "BR", "JP", "KR"}
)


def _require_non_empty(value, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ModerationStateError(f"{field} must be a non-empty text value")
    return " ".join(value.split())


def _normalize_text(value, field: str) -> str:
    if value is None:
        return ""
    if not isinstance(value, str):
        raise ModerationStateError(f"{field} must be text, got {type(value).__name__}")
    return " ".join(value.split())


def _sequence(values, field: str) -> list:
    if values is None:
        return []
    if isinstance(values, (str, bytes, Mapping)) or not isinstance(values, Iterable):
        raise ModerationStateError(f"{field} must be a sequence")
    return list(values)


def _normalize_names(values, field: str, limit: int | None = None) -> list[str]:
    """Return sorted unique names; `limit` keeps the first N in provider order."""
    names = []
    for raw in _sequence(values, field):
        if not isinstance(raw, str):
            raise ModerationStateError(
                f"{field} entries must be text, got {type(raw).__name__}"
            )
        cleaned = _normalize_text(raw, field)
        if cleaned:
            names.append(cleaned)
    return sorted(list(dict.fromkeys(names))[:limit])


def _normalize_people_names(values, field: str) -> list[str]:
    names = []
    for person in _sequence(values, field):
        if isinstance(person, str):
            raw_name = person
        elif isinstance(person, Mapping):
            raw_name = person.get("name")
        else:
            raise ModerationStateError(f"{field} entries must contain a text name")
        name = _normalize_text(raw_name, field)
        if name:
            names.append(name)
    return sorted(set(names))


def _normalize_certifications(values, field: str) -> list[str]:
    certifications = []
    for raw in _sequence(values, field):
        if not isinstance(raw, Mapping):
            raise ModerationStateError(f"{field} entries must contain a country and rating")
        country = _normalize_text(raw.get("country"), f"{field}.country").upper()
        rating = _normalize_text(raw.get("rating"), f"{field}.rating")
        if rating and country in CERTIFICATION_COUNTRIES:
            certifications.append(f"{country}: {rating}")
    return sorted(set(certifications))


def _normalize_age_ratings(values, field: str) -> list[str]:
    ratings = []
    for raw in _sequence(values, field):
        if not isinstance(raw, Mapping):
            raise ModerationStateError(f"{field} entries must contain an organization and rating")
        organization = _normalize_text(raw.get("organization"), f"{field}.organization")
        rating = _normalize_text(raw.get("rating"), f"{field}.rating")
        if not organization or not rating:
            continue
        descriptors = _normalize_names(raw.get("descriptors"), f"{field}.descriptors")
        label = f"{organization} {rating}"
        ratings.append(f"{label}: {'; '.join(descriptors)}" if descriptors else label)
    return sorted(set(ratings))


def _normalize_credits(values, field: str) -> list[dict[str, str]]:
    credits = []
    for credit in _sequence(values, field):
        if isinstance(credit, str):
            raw_name, raw_role = credit, None
        elif isinstance(credit, Mapping):
            raw_name = credit.get("name")
            raw_role = credit.get("role") or credit.get("type")
        else:
            raise ModerationStateError(f"{field} entries must contain text credit fields")
        name = _normalize_text(raw_name, f"{field}.name")
        role = _normalize_text(raw_role, f"{field}.role")
        if name or role:
            credits.append({"name": name, "role": role})
    return sorted(credits, key=lambda credit: (credit["name"], credit["role"]))


def _normalize_episodes(values) -> list[dict[str, str]]:
    episodes = []
    for episode in _sequence(values, "season.episodes"):
        if not isinstance(episode, Mapping):
            raise ModerationStateError("season.episodes entries must be named text objects")
        entry = {
            "title": _normalize_text(episode.get("title"), "season.episodes.title"),
            "description": _normalize_text(
                episode.get("description"), "season.episodes.description"
            ),
        }
        if entry["title"] or entry["description"]:
            episodes.append(entry)
    return sorted(episodes, key=lambda episode: (episode["title"], episode["description"]))


def _normalize_tracks(values) -> list[dict[str, object]]:
    tracks = []
    for track in _sequence(values, "album.tracks"):
        if not isinstance(track, Mapping):
            raise ModerationStateError("album.tracks entries must be named text objects")
        title = _normalize_text(track.get("title"), "album.tracks.title")
        credits = _normalize_credits(track.get("authors"), "album.tracks.credits")
        if title or credits:
            tracks.append({
                "title": title,
                "credits": credits,
                "parental_advisory": "explicit" if track.get("explicit") is True else "",
            })
    return sorted(
        tracks,
        key=lambda track: (
            track["title"],
            tuple((credit["name"], credit["role"]) for credit in track["credits"]),
            track["parental_advisory"],
        ),
    )


def _normalize_type_specific(content_type: str, reconstructed_payload) -> dict:
    if reconstructed_payload is None:
        reconstructed_payload = {}
    elif not isinstance(reconstructed_payload, Mapping):
        raise ModerationStateError("reconstructed payload must be a named object")

    kind = content_type.casefold()
    if kind in {"movie", "tv_show"}:
        return {
            kind: {
                "original_title": _normalize_text(
                    reconstructed_payload.get("original_title"),
                    f"{kind}.original_title",
                ),
                "tagline": _normalize_text(
                    reconstructed_payload.get("tagline"), f"{kind}.tagline"
                ),
                "genres": _normalize_names(
                    reconstructed_payload.get("genres"), f"{kind}.genres"
                ),
                "keywords": _normalize_names(
                    reconstructed_payload.get("keywords"),
                    f"{kind}.keywords",
                    limit=MAX_KEYWORDS,
                ),
                "certifications": _normalize_certifications(
                    reconstructed_payload.get("certifications"),
                    f"{kind}.certifications",
                ),
            }
        }

    if kind == "game":
        return {
            "game": {
                "genres": _normalize_names(
                    reconstructed_payload.get("genres"), "game.genres"
                ),
                "themes": _normalize_names(
                    reconstructed_payload.get("themes"), "game.themes"
                ),
                "game_modes": _normalize_names(
                    reconstructed_payload.get("game_modes"), "game.game_modes"
                ),
                "game_type": _normalize_text(
                    reconstructed_payload.get("game_type"), "game.game_type"
                ),
                "series": _normalize_text(
                    reconstructed_payload.get("series"), "game.series"
                ),
                "keywords": _normalize_names(
                    reconstructed_payload.get("keywords"),
                    "game.keywords",
                    limit=MAX_KEYWORDS,
                ),
                "age_ratings": _normalize_age_ratings(
                    reconstructed_payload.get("age_ratings"), "game.age_ratings"
                ),
            }
        }

    if kind == "season":
        return {
            "season": {
                "parent_show_name": _normalize_text(
                    reconstructed_payload.get("tv_show_name"),
                    "season.parent_show_name",
                ),
                "episodes": _normalize_episodes(reconstructed_payload.get("episodes")),
            }
        }

    if kind == "album":
        return {
            "album": {
                "artists": _normalize_people_names(
                    reconstructed_payload.get("authors"), "album.artists"
                ),
                "tracks": _normalize_tracks(reconstructed_payload.get("tracks")),
            }
        }

    if kind == "book":
        return {
            "book": {
                "authors": _normalize_people_names(
                    reconstructed_payload.get("authors"), "book.authors"
                ),
                "subjects": _normalize_names(
                    reconstructed_payload.get("subjects"),
                    "book.subjects",
                    limit=MAX_SUBJECTS,
                ),
            }
        }

    return {}


def build_moderation_state(
    *,
    provider,
    content_type,
    title=None,
    description=None,
    reconstructed_payload=None,
) -> dict:
    """Project persisted Core text into a normalized, named state.

    The reconstructed payload is allowlisted by content type. All episode and
    track text is retained without truncation. Only normalized text is copied;
    identifiers, URLs, assets, dates, durations, and raw payloads never enter
    the state. Provider safety metadata enters only as contextual text (genres,
    keywords, certifications, age ratings, subjects, a per-track advisory). The
    TMDB `adult` flag never does: authoritative overrides are code-owned and
    applied before, and independently of, any Jev call.
    """
    normalized_provider = _require_non_empty(provider, "provider").casefold()
    normalized_content_type = _require_non_empty(content_type, "content_type").upper()
    if reconstructed_payload is not None:
        if not isinstance(reconstructed_payload, Mapping):
            raise ModerationStateError("reconstructed payload must be a named object")
        title = reconstructed_payload.get("title")
        description = reconstructed_payload.get("description")

    return {
        "provider": normalized_provider,
        "content_type": normalized_content_type,
        "title": _normalize_text(title, "title"),
        "description": _normalize_text(description, "description"),
        "type_specific": _normalize_type_specific(
            normalized_content_type, reconstructed_payload
        ),
    }


def hash_moderation_state(state: dict) -> str:
    """Hash normalized moderation state using the canonical identity format."""
    canonical = json.dumps(state, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()
