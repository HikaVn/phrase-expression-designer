"""Expression Macros (spec §9.3).

A macro is a named, multi-parameter expression preset: applied over a tick range
it produces several ExpressionCurves at once (intensity, vibrato, timbre, ...).
Where a template shapes a single parameter, a macro shapes the whole gesture.

Each parameter's points are normalized: (position 0..1 across the range,
value 0..1, shape).
"""

from __future__ import annotations

from dataclasses import dataclass

from ..core.curve import CurvePoint, ExpressionCurve

NormPoints = tuple[tuple[float, float, str], ...]


@dataclass(frozen=True)
class Macro:
    name: str
    layers: dict[str, NormPoints]  # parameter -> normalized points


def _swell(a: float, peak: float, b: float) -> NormPoints:
    return ((0.0, a, "smooth"), (0.6, peak, "smooth"), (1.0, b, "smooth"))


MACROS: dict[str, Macro] = {
    "emotional_swell": Macro("emotional_swell", {
        "intensity": _swell(0.30, 0.90, 0.55),
        "vibratoDepth": ((0.0, 0.1, "smooth"), (0.5, 0.5, "smooth"), (1.0, 0.8, "smooth")),
        "timbre": _swell(0.35, 0.80, 0.45),
    }),
    "soft_entry": Macro("soft_entry", {
        "intensity": ((0.0, 0.05, "smooth"), (0.25, 0.45, "smooth"), (1.0, 0.65, "smooth")),
        "vibratoDepth": ((0.0, 0.0, "smooth"), (0.4, 0.2, "smooth"), (1.0, 0.5, "smooth")),
        "timbre": ((0.0, 0.2, "smooth"), (1.0, 0.5, "smooth")),
    }),
    "strong_attack": Macro("strong_attack", {
        "intensity": ((0.0, 0.85, "smooth"), (0.2, 0.95, "smooth"), (1.0, 0.6, "smooth")),
        "attackSharpness": ((0.0, 0.9, "linear"), (0.3, 0.5, "smooth"), (1.0, 0.3, "smooth")),
        "timbre": ((0.0, 0.7, "smooth"), (1.0, 0.5, "smooth")),
    }),
    "breath_ending": Macro("breath_ending", {
        "intensity": ((0.0, 0.7, "smooth"), (0.75, 0.6, "smooth"), (1.0, 0.05, "smooth")),
        "vibratoDepth": ((0.0, 0.5, "smooth"), (0.8, 0.4, "smooth"), (1.0, 0.0, "smooth")),
        "air": ((0.0, 0.2, "smooth"), (1.0, 0.8, "smooth")),
    }),
    "cinematic_rise": Macro("cinematic_rise", {
        "intensity": ((0.0, 0.15, "smooth"), (1.0, 1.0, "smooth")),
        "vibratoDepth": ((0.0, 0.0, "smooth"), (0.6, 0.3, "smooth"), (1.0, 0.9, "smooth")),
        "timbre": ((0.0, 0.2, "smooth"), (1.0, 0.95, "smooth")),
        "tension": ((0.0, 0.1, "smooth"), (1.0, 0.9, "smooth")),
    }),
    "classical_restrained": Macro("classical_restrained", {
        "intensity": _swell(0.35, 0.6, 0.4),
        "vibratoDepth": ((0.0, 0.2, "smooth"), (1.0, 0.4, "smooth")),
        "timbre": ((0.0, 0.4, "smooth"), (1.0, 0.45, "smooth")),
    }),
    "anime_strings": Macro("anime_strings", {
        "intensity": _swell(0.4, 0.95, 0.6),
        "vibratoDepth": ((0.0, 0.3, "smooth"), (0.5, 0.7, "smooth"), (1.0, 0.9, "smooth")),
        "timbre": _swell(0.5, 0.9, 0.6),
    }),
    "pop_strings_support": Macro("pop_strings_support", {
        "intensity": ((0.0, 0.5, "smooth"), (1.0, 0.55, "smooth")),
        "volume": ((0.0, 0.5, "smooth"), (1.0, 0.55, "smooth")),
        "vibratoDepth": ((0.0, 0.3, "smooth"), (1.0, 0.4, "smooth")),
    }),
    "trailer_tension": Macro("trailer_tension", {
        "intensity": ((0.0, 0.4, "smooth"), (0.85, 0.7, "smooth"), (1.0, 1.0, "linear")),
        "tension": ((0.0, 0.3, "smooth"), (1.0, 1.0, "smooth")),
        "timbre": ((0.0, 0.3, "smooth"), (1.0, 0.85, "smooth")),
    }),
}


def macro_names() -> list[str]:
    return sorted(MACROS)


def build_macro(
    name: str, id_prefix: str, start_tick: int, end_tick: int
) -> list[ExpressionCurve]:
    """Instantiate a macro as a list of ExpressionCurves over [start_tick, end_tick]."""
    try:
        macro = MACROS[name]
    except KeyError as exc:
        raise ValueError(
            f"Unknown macro {name!r}; available: {', '.join(macro_names())}"
        ) from exc
    if end_tick <= start_tick:
        raise ValueError("end_tick must be greater than start_tick")
    span = end_tick - start_tick

    curves: list[ExpressionCurve] = []
    for parameter, norm_points in macro.layers.items():
        points = [
            CurvePoint(tick=start_tick + round(pos * span), value=value, shape=shape)
            for pos, value, shape in norm_points
        ]
        curves.append(
            ExpressionCurve(id=f"{id_prefix}__{parameter}", parameter=parameter, points=points)
        )
    return curves
