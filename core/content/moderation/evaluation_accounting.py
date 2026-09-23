"""Pure latency, token, and priced-cost aggregation for evaluation reports."""
from __future__ import annotations

import math
import re
from collections.abc import Mapping, Sequence
from decimal import Decimal
from typing import Any

URL_RE = re.compile(r"(?:https?://|www\.)", re.I)
SECRET_RE = re.compile(r"\b(?:api[_ -]?key|access[_ -]?token|client[_ -]?secret|password|bearer)\b", re.I)


class EvaluationAccountingValidationError(ValueError):
    """Invalid offline usage or duration inputs."""


def _price(value: Any, field: str) -> Decimal | None:
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float, Decimal)):
        raise EvaluationAccountingValidationError(f"{field}: expected a non-negative number or null")
    price = Decimal(str(value))
    if not price.is_finite() or price < 0:
        raise EvaluationAccountingValidationError(f"{field}: expected a finite non-negative price")
    return price


def _percentile(values: Sequence[float], quantile: float) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    position = (len(ordered) - 1) * quantile
    lower, upper = math.floor(position), math.ceil(position)
    return round(ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower), 6)


def build_accounting_summary(
    rows: Sequence[Mapping[str, Any]],
    *,
    durations_ms: Mapping[str, Any] | None = None,
    price_per_million_input_tokens: Any = None,
    price_per_million_output_tokens: Any = None,
    price_provenance: str | None = None,
) -> dict[str, Any]:
    """Summarize caller-supplied durations and response usage; never calls an SDK."""
    duration_map = {} if durations_ms is None else durations_ms
    case_ids = {row["case_id"] for row in rows}
    if not isinstance(duration_map, Mapping) or not set(duration_map).issubset(case_ids):
        raise EvaluationAccountingValidationError("duration keys must be known opaque case IDs")
    durations = []
    for case_id, value in duration_map.items():
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0:
            raise EvaluationAccountingValidationError(f"duration for {case_id} must be finite and non-negative")
        durations.append(float(value))

    input_price = _price(price_per_million_input_tokens, "price_per_million_input_tokens")
    output_price = _price(price_per_million_output_tokens, "price_per_million_output_tokens")
    prices_given = input_price is not None or output_price is not None
    if prices_given and (not isinstance(price_provenance, str) or not price_provenance.strip()):
        raise EvaluationAccountingValidationError("price_provenance is required with token prices")
    if price_provenance is not None and (
        not isinstance(price_provenance, str) or len(price_provenance) > 200
        or URL_RE.search(price_provenance) or SECRET_RE.search(price_provenance)
    ):
        raise EvaluationAccountingValidationError("price_provenance must be a short non-secret label")

    attempted = [row for row in rows if row["inference_attempted"]]
    input_known = [row["input_tokens"] for row in attempted if row["input_tokens"] is not None]
    output_known = [row["output_tokens"] for row in attempted if row["output_tokens"] is not None]
    missing_usage = sum(
        row["input_tokens"] is None or row["output_tokens"] is None for row in attempted
    )

    known_cost = total_cost = None
    cost_status = "no_inference_usage" if not attempted else "not_priced"
    if attempted and input_price is not None and output_price is not None:
        if input_known or output_known:
            known_token_cost = sum(
                (Decimal(row["input_tokens"]) * input_price if row["input_tokens"] is not None else Decimal(0))
                + (Decimal(row["output_tokens"]) * output_price if row["output_tokens"] is not None else Decimal(0))
                for row in attempted
            )
            cost = (known_token_cost / Decimal(1_000_000)).quantize(Decimal("0.00000001"))
            known_cost = format(cost, "f")
        if missing_usage:
            cost_status = "incomplete_usage"
        else:
            cost_status, total_cost = "complete", known_cost
    elif attempted and prices_given:
        cost_status = "missing_price_rate"

    return {
        "latency_ms": {
            "supplied_count": len(durations),
            "missing_count": len(rows) - len(durations),
            "p50": _percentile(durations, 0.50),
            "p95": _percentile(durations, 0.95),
            "source": "caller-supplied per-case durations; not SDK latency",
        },
        "usage": {
            "inference_count": len(attempted),
            "missing_usage_count": missing_usage,
            "input_tokens": {"known_total": sum(input_known), "reported_case_count": len(input_known)},
            "output_tokens": {"known_total": sum(output_known), "reported_case_count": len(output_known)},
            "cost": {
                "currency": "USD",
                "input_price_per_million_tokens": str(input_price) if input_price is not None else None,
                "output_price_per_million_tokens": str(output_price) if output_price is not None else None,
                "price_provenance": price_provenance,
                "known_usage_cost_usd": known_cost,
                "total_usd": total_cost,
                "status": cost_status,
            },
        },
    }
