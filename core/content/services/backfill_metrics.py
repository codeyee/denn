"""Backfill pricing snapshot and cost estimation (JEV-003B slice 2A).

Framework-independent: published TypeSafe pricing plus its provenance and a
validated operator rate override. No Django, ORM, network, or Jev calls.
Item accounting, retry bounds, and summary serialization follow in the next
stacked slice; the full draft is preserved out of tree until then.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, replace

DEFAULT_PRICING_SNAPSHOT = {
    'source_url': 'https://typesafe.ai/blog/introducing-system-one-models-and-jev',
    'source_date': '2026-09-15',
    'accessed_date': '2026-09-21',
    'currency': 'USD',
    'input_tokens_per_unit': 1_000_000,
    'input_price_per_unit': 0.042,
    'output_tokens_per_unit': 1_000_000,
    'output_price_per_unit': 0.0,
    'note': 'Estimate only; account or gateway pricing may differ.',
}


def parse_price(raw, name: str = 'price') -> float:
    """Parse an operator price into a finite non-negative float, else raise."""
    if isinstance(raw, bool):
        raise ValueError(f'{name} must be a non-negative finite number')
    try:
        number = float(raw)
    except (TypeError, ValueError) as error:
        raise ValueError(f'{name} must be a finite number') from error
    if number != number or number in (float('inf'), float('-inf')) or number < 0:
        raise ValueError(f'{name} must be a non-negative finite number')
    return number


@dataclass(frozen=True)
class PricingSnapshot:
    """Published model pricing plus its provenance, used for cost estimates."""

    source_url: str
    source_date: str
    accessed_date: str
    currency: str
    input_tokens_per_unit: int
    input_price_per_unit: float
    output_tokens_per_unit: int
    output_price_per_unit: float
    note: str

    def as_dict(self) -> dict:
        return asdict(self)

    def estimate_cost_usd(self, input_tokens: int, output_tokens: int) -> float:
        """Return the estimated USD cost for the given attributable tokens."""
        input_cost = input_tokens / self.input_tokens_per_unit * self.input_price_per_unit
        output_cost = output_tokens / self.output_tokens_per_unit * self.output_price_per_unit
        return round(input_cost + output_cost, 6)

    def with_input_rate(self, input_price_per_unit: float) -> 'PricingSnapshot':
        """Return a copy using an operator rate, keeping the provenance intact."""
        rate = parse_price(input_price_per_unit, 'input_price_per_unit')
        return replace(self, input_price_per_unit=rate,
                       note=f'Configured rate override; {self.note}')


def default_pricing() -> PricingSnapshot:
    """Return the published pricing snapshot used when no rate is configured."""
    return PricingSnapshot(**DEFAULT_PRICING_SNAPSHOT)
