"""The three independent typed Noul moderation questions (JEV-002A).

The questions are shared, stable inputs: every moderation call sends this
mapping verbatim, and the question revision must be bumped together with
any wording change.
"""
from typesafe_sdk import Noul

MODERATION_QUESTION_REVISION = "jev-mq-1"

MODERATION_QUESTIONS: dict[str, Noul] = {
    "adult_content": Noul(
        instructions=(
            "Given the state's provider, content type, title, description, genres, and "
            "tags, does this work explicitly target adults (18+) through explicit "
            "sexual material, erotic content, or an adult-only classification? Judge "
            "only from the text in the state; never infer from the provider or "
            "content type alone."
        ),
        criteria={
            "true": "The state text explicitly signals adult-only material: 18+ classifications, explicit sexual or erotic content, or equivalent adult markers.",
            "false": "The state is all-audience material, contains only generic conflict or tension, or offers no adult signal.",
        },
    ),
    "graphic_violence": Noul(
        instructions=(
            "Given the state's provider, content type, title, description, genres, and "
            "tags, does the text explicitly signal graphic violence or gore beyond "
            "ordinary conflict? Judge only from the text in the state; do not infer "
            "violence from a genre name alone."
        ),
        criteria={
            "true": "The text itself describes or clearly signals graphic violence or gore, such as explicit brutality, viscera, torture, or dismemberment.",
            "false": "The text shows no violence, only non-graphic references, or generic conflict wording.",
        },
    ),
    "offensive_content": Noul(
        instructions=(
            "Given the state's provider, content type, title, description, genres, and "
            "tags, does the text contain or signal explicit hate speech, slurs, or "
            "severe shock content? Judge only from the text in the state."
        ),
        criteria={
            "true": "The text contains explicit hate speech, slurs, or severe shock wording.",
            "false": "The text carries no hate-speech, slur, or shock-content signal.",
        },
    ),
}
