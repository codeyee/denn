"""The independent typed Noul moderation questions (issue #102 contract).

The three keys are the persisted contract: every moderation call sends this
mapping verbatim, and the configured revision
(`settings.MODERATION_QUESTION_REVISION`, currently `q1`) is the only
revision source suitable for persistence identity.
"""
from typesafe_sdk import Noul

MODERATION_QUESTIONS: dict[str, Noul] = {
    "safe_for_automatic_discovery": Noul(
        instructions=(
            "Given the state's provider, content type, title, description, genres, and "
            "tags, is this work safe for automatic discovery surfaces (all-audience, "
            "non-explicit material)? Judge only from the text in the state; never "
            "infer safety from the provider or content type alone."
        ),
        criteria={
            "true": "The state text is all-audience material with no adult, explicit, or shock-only signal.",
            "false": "The text shows any explicit or sensitive marker that makes automatic discovery unsafe.",
        },
    ),
    "explicit_or_sensitive": Noul(
        instructions=(
            "Given the state's provider, content type, title, description, genres, and "
            "tags, does the text signal explicit sexual material, erotic adult-only "
            "content, graphic violence or gore, or severe hate or shock content? Judge "
            "only from the text in the state."
        ),
        criteria={
            "true": "The text explicitly signals adult-only material, graphic violence, gore, explicit hate speech, or severe shock content.",
            "false": "The text carries no explicit or sensitive signal under the contract.",
        },
    ),
    "needs_review": Noul(
        instructions=(
            "Given the state's provider, content type, title, description, genres, and "
            "tags, is the metadata sparse, ambiguous, contradictory, or otherwise "
            "insufficient to classify safety confidently? Judge only from the text in "
            "the state; answer yes whenever the available metadata is insufficient or "
            "signals conflict rather than clarity."
        ),
        criteria={
            "true": "The metadata is sparse, ambiguous, contradictory, or insufficient to classify confidently.",
            "false": "The metadata is sufficient and internally consistent for a confident safety judgment.",
        },
    ),
}


def moderation_question_revision() -> str:
    """Return the configured moderation question revision for persistence identity."""
    from django.conf import settings
    return settings.MODERATION_QUESTION_REVISION
