"""The independent typed Noul moderation questions (issue #102 contract).

The three keys are the persisted contract: every moderation call sends this
mapping verbatim, and the configured revision
(`settings.MODERATION_QUESTION_REVISION`, currently `q3`) is the only
revision source suitable for persistence identity.
"""
from typesafe_sdk import Noul

_STATE_FIELDS = (
    "provider", "content_type", "title", "description",
    "type_specific.movie.original_title", "type_specific.movie.tagline",
    "type_specific.tv_show.original_title", "type_specific.tv_show.tagline",
    "type_specific.game.genres", "type_specific.game.themes",
    "type_specific.game.game_modes", "type_specific.game.game_type",
    "type_specific.game.series", "type_specific.season.parent_show_name",
    "type_specific.season.episodes[].title",
    "type_specific.season.episodes[].description",
    "type_specific.album.artists", "type_specific.album.tracks[].title",
    "type_specific.album.tracks[].credits[].name",
    "type_specific.album.tracks[].credits[].role", "type_specific.book.authors",
)
_STATE_GUIDANCE = (
    "Use the state's named text fields " + ", ".join(f"`{field}`" for field in _STATE_FIELDS)
    + ". Only fields present for this content type contain evidence; empty or missing "
    "text is not evidence."
)

MODERATION_QUESTIONS: dict[str, Noul] = {
    "safe_for_automatic_discovery": Noul(
        instructions=(
            f"{_STATE_GUIDANCE} Is this work safe for automatic discovery surfaces? "
            "Judge only from "
            "concrete text evidence. Ordinary entertainment with mature themes, crime, "
            "horror, action, non-graphic violence, profanity, romance, or alcohol/drug "
            "references remains safe. Do not infer restriction from the provider or "
            "content type alone."
        ),
        criteria={
            "true": (
                "The text contains no concrete evidence of adult-only explicit sexual "
                "content or nudity, graphic gore or extreme violence, sexual exploitation, "
                "or hateful/extremist propaganda. Sparse metadata alone is not evidence "
                "of restriction."
            ),
            "false": (
                "The text contains concrete evidence of adult-only explicit sexual content "
                "or nudity, graphic gore or extreme violence, sexual exploitation, or "
                "hateful/extremist propaganda."
            ),
        },
    ),
    "explicit_or_sensitive": Noul(
        instructions=(
            f"{_STATE_GUIDANCE} Does the metadata clearly indicate adult-only explicit sexual content "
            "or nudity, graphic gore or extreme violence, sexual exploitation, or "
            "hateful/extremist propaganda? Ordinary mature themes and common entertainment "
            "references are not restricted. Do not infer restriction from the provider or "
            "content type alone."
        ),
        criteria={
            "true": (
                "The text clearly indicates adult-only explicit sexual content or nudity, "
                "graphic gore or extreme violence, sexual exploitation, or hateful/extremist "
                "propaganda."
            ),
            "false": (
                "The text indicates only ordinary mature themes, crime, horror, action, "
                "non-graphic violence, profanity, romance, or alcohol/drug references; "
                "sparse metadata, an unfamiliar title, or empty type-specific text, and the "
                "provider or content type alone are not evidence of restriction."
            ),
        },
    ),
    "needs_review": Noul(
        instructions=(
            f"{_STATE_GUIDANCE} Does the metadata contain a concrete but ambiguous or contradictory "
            "signal of adult-only explicit sexual content or nudity, graphic gore or "
            "extreme violence, sexual exploitation, or hateful/extremist propaganda that "
            "requires a human decision? Sparse metadata alone, an unfamiliar title, "
            "empty type-specific text, and ordinary mature themes are not reasons to review. "
            "Do not infer restriction from the provider or content type alone."
        ),
        criteria={
            "true": (
                "A concrete signal of a restricted category is present, but its meaning "
                "is ambiguous or contradictory and a human must decide."
            ),
            "false": (
                "There is no concrete ambiguous or contradictory signal of a restricted "
                "category. Sparse metadata alone, an unfamiliar title, empty type-specific "
                "text, and ordinary mature themes are false."
            ),
        },
    ),
}


def moderation_question_revision() -> str:
    """Return the configured moderation question revision for persistence identity."""
    from django.conf import settings
    return settings.MODERATION_QUESTION_REVISION
