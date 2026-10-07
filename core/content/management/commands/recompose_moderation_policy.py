"""Recompose stored moderation judgments under the current code-owned policy.

Reads only the persisted raw Noul probabilities: no Jev call, no client, no
network. Dry run by default; `--apply` writes `classification`,
`policy_revision`, `payload['policy']` and `payload['policy_thresholds']` in
place. Output contains counts and ids only, never titles or payload contents.
"""
from __future__ import annotations

from argparse import ArgumentTypeError
from collections import Counter

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from content.models import ContentModerationJudgment
from content.moderation.policy import PolicyThresholds, compose_policy
from content.services.moderation_service import PROVIDER_RULE_MODELS, _map_decision

NOUL_KEYS = (
    "safe_for_automatic_discovery",
    "explicit_or_sensitive",
    "needs_review",
)
MAX_LISTED_IDS = 20


def _positive_int(raw):
    try:
        value = int(raw)
    except (TypeError, ValueError):
        raise ArgumentTypeError("must be a positive integer")
    if value <= 0:
        raise ArgumentTypeError("must be a positive integer")
    return value


class Command(BaseCommand):
    help = (
        "Recompose COMPLETE moderation judgments from their stored raw "
        "probabilities under the current policy thresholds and revision. "
        "Dry run unless --apply is given. Makes no Jev or network calls."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Write the changes. Without it nothing is written.",
        )
        parser.add_argument(
            "--all",
            action="store_true",
            help="Also recompose judgments already at the current policy revision.",
        )
        parser.add_argument("--batch-size", type=_positive_int, default=500)

    def handle(self, *args, **options):
        apply = options["apply"]
        batch_size = options["batch_size"]
        include_current = options["all"]
        revision = settings.MODERATION_POLICY_REVISION
        thresholds = PolicyThresholds()
        thresholds_payload = {
            "safe_min": thresholds.safe_min,
            "explicit_at": thresholds.explicit_at,
            "review_at": thresholds.review_at,
        }

        counts = Counter()
        transitions = Counter()
        malformed_ids = []
        pending = []
        last_pk = 0
        queryset = ContentModerationJudgment.objects.filter(
            status=ContentModerationJudgment.Status.COMPLETE
        ).order_by("pk")

        while True:
            rows = list(queryset.filter(pk__gt=last_pk)[:batch_size])
            if not rows:
                break
            last_pk = rows[-1].pk
            for judgment in rows:
                counts["examined"] += 1
                if judgment.model_name in PROVIDER_RULE_MODELS:
                    counts["skipped_provider_rule"] += 1
                    continue
                if not include_current and judgment.policy_revision == revision:
                    counts["skipped_current_revision"] += 1
                    continue
                probabilities = _raw_probabilities(judgment.payload)
                if probabilities is None:
                    counts["skipped_malformed_raw_nouls"] += 1
                    if len(malformed_ids) < MAX_LISTED_IDS:
                        malformed_ids.append(judgment.pk)
                    continue
                counts["selected"] += 1
                if self._recompose(judgment, probabilities, revision, thresholds, thresholds_payload, transitions):
                    pending.append(judgment)
                else:
                    counts["unchanged"] += 1
            if apply and len(pending) >= batch_size:
                counts["updated"] += self._flush(pending)
                pending = []
        if apply and pending:
            counts["updated"] += self._flush(pending)
        counts["to_change"] = counts["updated"] if apply else counts["selected"] - counts["unchanged"]

        self._report(apply, revision, counts, transitions, malformed_ids)

    def _recompose(self, judgment, probabilities, revision, thresholds, thresholds_payload, transitions):
        """Mutate the in-memory row; return True when anything differs."""
        payload = dict(judgment.payload)
        result = compose_policy(
            payload.get("provider_explicit"),
            *probabilities,
            thresholds=thresholds,
        )
        new_classification = _map_decision(result.decision)
        new_policy = {"decision": result.decision, "reason": result.reason}
        transitions[(judgment.classification, new_classification)] += 1
        changed = (
            judgment.classification != new_classification
            or judgment.policy_revision != revision
            or payload.get("policy") != new_policy
            or payload.get("policy_thresholds") != thresholds_payload
        )
        if changed:
            payload["policy"] = new_policy
            payload["policy_thresholds"] = thresholds_payload
            judgment.payload = payload
            judgment.classification = new_classification
            judgment.policy_revision = revision
        return changed

    def _flush(self, rows):
        with transaction.atomic():
            ContentModerationJudgment.objects.bulk_update(
                rows, ["classification", "policy_revision", "payload"]
            )
        return len(rows)

    def _report(self, apply, revision, counts, transitions, malformed_ids):
        write = self.stdout.write
        write(f"mode={'apply' if apply else 'dry-run'} policy_revision={revision}")
        for key in (
            "examined",
            "selected",
            "skipped_provider_rule",
            "skipped_current_revision",
            "skipped_malformed_raw_nouls",
            "unchanged",
            "to_change",
        ):
            write(f"{key}={counts[key]}")
        if apply:
            write(f"updated={counts['updated']}")
        if malformed_ids:
            write("malformed_ids=" + ",".join(str(pk) for pk in malformed_ids))
        write("transitions (old -> new: count)")
        for (old, new), count in sorted(transitions.items()):
            write(f"  {old} -> {new}: {count}")


def _raw_probabilities(payload):
    """Return (safe, explicit, review) or None when raw_nouls is unusable."""
    raw = payload.get("raw_nouls") if isinstance(payload, dict) else None
    if not isinstance(raw, dict) or any(key not in raw for key in NOUL_KEYS):
        return None
    values = tuple(raw[key] for key in NOUL_KEYS)
    for value in values:
        if value is None:
            continue
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            return None
    return values
