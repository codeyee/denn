"""Read-only moderation summaries for content API responses."""

from django.db.models import Exists, OuterRef, Prefetch, Subquery

from content.models import ContentModerationJudgment


LATEST_MODERATION_ATTRIBUTE = "latest_moderation_judgments"
ANNOTATED_MODERATION_FIELDS = (
    "moderation_has_judgment",
    "moderation_status",
    "moderation_classification",
)

_PUBLIC_CLASSIFICATIONS = {
    ContentModerationJudgment.Classification.SAFE: "safe",
    ContentModerationJudgment.Classification.EXPLICIT: "explicit",
    ContentModerationJudgment.Classification.NEEDS_REVIEW: "needs_review",
}


def latest_moderation_prefetch(prefix=""):
    """Prefetch only the latest judgment for each item in a result set."""
    return Prefetch(
        f"{prefix}moderation_judgments",
        queryset=(
            ContentModerationJudgment.objects.only(
                "id",
                "content_item_id",
                "requested_at",
                "status",
                "classification",
            )
            .order_by("-requested_at", "-pk")[:1]
        ),
        to_attr=LATEST_MODERATION_ATTRIBUTE,
    )


def with_moderation_summary(queryset):
    """Annotate the latest summary without adding a query to the queryset."""
    latest = ContentModerationJudgment.objects.filter(
        content_item_id=OuterRef("pk")
    ).order_by("-requested_at", "-pk")
    return queryset.annotate(
        moderation_has_judgment=Exists(latest),
        moderation_status=Subquery(latest.values("status")[:1]),
        moderation_classification=Subquery(latest.values("classification")[:1]),
    )


def _latest_judgment(content_item):
    prefetched = getattr(content_item, LATEST_MODERATION_ATTRIBUTE, None)
    if prefetched is not None:
        return prefetched[0] if prefetched else None

    # Single-item writes and less common callers may serialize without a
    # queryset prefetch. List endpoints add latest_moderation_prefetch() to
    # keep this compatibility path from becoming an N+1 query.
    judgment = content_item.moderation_judgments.order_by(
        "-requested_at", "-pk"
    ).first()
    setattr(
        content_item,
        LATEST_MODERATION_ATTRIBUTE,
        [judgment] if judgment is not None else [],
    )
    return judgment


def moderation_summary(content_item):
    """Return the allowlisted API view of the latest persisted judgment.

    This does not infer freshness from the source hash. It only preserves
    statuses persisted by the classifier and never attaches a classification
    to pending, stale, errored, or malformed judgments.
    """
    if all(hasattr(content_item, field) for field in ANNOTATED_MODERATION_FIELDS):
        has_judgment = content_item.moderation_has_judgment
        status = content_item.moderation_status
        classification = content_item.moderation_classification
    else:
        judgment = _latest_judgment(content_item)
        has_judgment = judgment is not None
        status = judgment.status if judgment is not None else None
        classification = judgment.classification if judgment is not None else None

    if not has_judgment:
        return {"status": "missing", "classification": None}

    if status not in {
        ContentModerationJudgment.Status.PENDING,
        ContentModerationJudgment.Status.COMPLETE,
        ContentModerationJudgment.Status.STALE,
        ContentModerationJudgment.Status.ERROR,
    }:
        return {"status": "error", "classification": None}

    if status != ContentModerationJudgment.Status.COMPLETE:
        return {"status": status, "classification": None}

    public_classification = _PUBLIC_CLASSIFICATIONS.get(classification)
    if public_classification is not None:
        return {"status": "complete", "classification": public_classification}

    if classification == ContentModerationJudgment.Classification.UNKNOWN:
        return {"status": "complete", "classification": None}

    return {"status": "error", "classification": None}
