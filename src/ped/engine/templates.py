"""Expression templates: generate an ExpressionCurve across a tick range.

Each template is described by normalized control points (position 0.0-1.0 across
the range, value 0.0-1.0). ``build_curve`` maps those onto an absolute tick span.
This keeps templates resolution-independent and easy to test.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from ..core.curve import CurvePoint, ExpressionCurve


@dataclass(frozen=True)
class TemplateShape:
    parameter: str
    # (position 0..1, value 0..1, shape)
    points: tuple[tuple[float, float, str], ...]


# Built-in templates (Task 008 / Phase 6).
TEMPLATES: dict[str, TemplateShape] = {
    "natural_swell": TemplateShape(
        "intensity",
        ((0.0, 0.30, "smooth"), (0.6, 0.85, "smooth"), (1.0, 0.70, "smooth")),
    ),
    "decrescendo": TemplateShape(
        "intensity",
        ((0.0, 0.90, "smooth"), (1.0, 0.20, "smooth")),
    ),
    "phrase_arch": TemplateShape(
        "intensity",
        ((0.0, 0.30, "smooth"), (0.5, 0.90, "smooth"), (1.0, 0.30, "smooth")),
    ),
    "soft_entry": TemplateShape(
        "intensity",
        ((0.0, 0.08, "smooth"), (0.2, 0.45, "smooth"), (1.0, 0.70, "smooth")),
    ),
    "breath_ending": TemplateShape(
        "intensity",
        ((0.0, 0.70, "smooth"), (0.75, 0.65, "smooth"), (1.0, 0.05, "smooth")),
    ),
    "delayed_vibrato": TemplateShape(
        "vibratoDepth",
        ((0.0, 0.0, "smooth"), (0.4, 0.05, "smooth"), (1.0, 0.80, "smooth")),
    ),
}

TemplateFactory = Callable[[str, int, int], ExpressionCurve]


def template_names() -> list[str]:
    return sorted(TEMPLATES)


def build_curve(name: str, curve_id: str, start_tick: int, end_tick: int) -> ExpressionCurve:
    """Instantiate a named template as an ExpressionCurve over [start_tick, end_tick]."""
    try:
        shape = TEMPLATES[name]
    except KeyError as exc:
        raise ValueError(
            f"Unknown template {name!r}; available: {', '.join(template_names())}"
        ) from exc
    if end_tick <= start_tick:
        raise ValueError("end_tick must be greater than start_tick")

    span = end_tick - start_tick
    points = [
        CurvePoint(tick=start_tick + round(pos * span), value=value, shape=shp)
        for pos, value, shp in shape.points
    ]
    return ExpressionCurve(id=curve_id, parameter=shape.parameter, points=points)
