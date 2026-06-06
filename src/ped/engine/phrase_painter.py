"""Phrase Painter (spec §9.2).

Take one drawn intent line (typically ``intensity``) and derive several related
expression curves from it, each with its own delay and shaping:

  * ``volume`` (CC11) tracks intensity but stays fuller (less range, lifted floor)
  * ``vibratoDepth`` enters slightly late and grows with intensity
  * ``timbre`` brightens as intensity rises

Each derived curve is the source curve with points shifted in time (delay) and
remapped ``value -> clip01(bias + gain * value)``.
"""

from __future__ import annotations

from dataclasses import dataclass

from ..core.curve import CurvePoint, ExpressionCurve, clip01


@dataclass(frozen=True)
class PaintTarget:
    parameter: str
    delay_ticks: int = 0   # positive = responds later than the source
    gain: float = 1.0      # how strongly it follows the source
    bias: float = 0.0      # floor / offset added before clipping
    shape_override: str | None = None


# Sensible default expansion of an intensity line.
DEFAULT_TARGETS: tuple[PaintTarget, ...] = (
    PaintTarget("volume", delay_ticks=0, gain=0.6, bias=0.4),
    PaintTarget("vibratoDepth", delay_ticks=120, gain=1.0, bias=0.0),
    PaintTarget("timbre", delay_ticks=0, gain=0.8, bias=0.15),
)


def paint(
    source: ExpressionCurve,
    targets: tuple[PaintTarget, ...] = DEFAULT_TARGETS,
    id_prefix: str | None = None,
) -> list[ExpressionCurve]:
    """Derive curves from ``source`` according to ``targets``."""
    prefix = id_prefix or source.id
    out: list[ExpressionCurve] = []
    src_points = source.sorted_points()
    for target in targets:
        points = [
            CurvePoint(
                tick=max(0, p.tick + target.delay_ticks),
                value=clip01(target.bias + target.gain * p.value),
                shape=target.shape_override or p.shape,
            )
            for p in src_points
        ]
        out.append(
            ExpressionCurve(
                id=f"{prefix}__{target.parameter}",
                parameter=target.parameter,
                points=points,
            )
        )
    return out
