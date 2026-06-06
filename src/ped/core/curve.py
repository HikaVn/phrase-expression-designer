"""ExpressionCurve: a normalized (0.0-1.0) performance-intent curve over ticks.

A curve is a sorted list of ``CurvePoint``s. Interpolation between two adjacent
points uses the *shape of the left point* (the point the segment leaves from):

    "linear"  straight line
    "smooth"  smoothstep ease-in-out (3t^2 - 2t^3)
    "hold"    step; value stays flat until the next point

Outside the point range the curve holds the first/last value (no extrapolation).
All output is clipped to [0.0, 1.0]; intent values are normalized by definition.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

VALID_SHAPES = ("linear", "smooth", "hold")


def clip01(value: float) -> float:
    """Clip a value into the normalized [0.0, 1.0] range."""
    if value < 0.0:
        return 0.0
    if value > 1.0:
        return 1.0
    return value


def _smoothstep(t: float) -> float:
    return t * t * (3.0 - 2.0 * t)


@dataclass
class CurvePoint:
    tick: int
    value: float
    shape: str = "smooth"

    def __post_init__(self) -> None:
        if self.shape not in VALID_SHAPES:
            raise ValueError(
                f"Unknown curve shape {self.shape!r}; expected one of {VALID_SHAPES}"
            )
        self.value = clip01(float(self.value))

    def to_dict(self) -> dict[str, Any]:
        return {"tick": self.tick, "value": self.value, "shape": self.shape}

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> CurvePoint:
        return cls(
            tick=int(data["tick"]),
            value=float(data["value"]),
            shape=data.get("shape", "smooth"),
        )


@dataclass
class ExpressionCurve:
    id: str
    parameter: str  # e.g. "intensity", "timbre", "vibratoDepth"
    points: list[CurvePoint] = field(default_factory=list)

    def sorted_points(self) -> list[CurvePoint]:
        return sorted(self.points, key=lambda p: p.tick)

    def value_at(self, tick: int) -> float:
        """Evaluate the curve at ``tick``, clipped to [0.0, 1.0]."""
        pts = self.sorted_points()
        if not pts:
            return 0.0
        if tick <= pts[0].tick:
            return pts[0].value
        if tick >= pts[-1].tick:
            return pts[-1].value

        for left, right in zip(pts, pts[1:], strict=False):
            if left.tick <= tick <= right.tick:
                if left.shape == "hold" or right.tick == left.tick:
                    return clip01(left.value)
                t = (tick - left.tick) / (right.tick - left.tick)
                if left.shape == "smooth":
                    t = _smoothstep(t)
                return clip01(left.value + (right.value - left.value) * t)
        return pts[-1].value  # unreachable, but keeps the type checker happy

    def sample(self, start_tick: int, end_tick: int, step_tick: int) -> list[tuple[int, float]]:
        """Sample the curve over [start_tick, end_tick] inclusive at a fixed step."""
        if step_tick <= 0:
            raise ValueError("step_tick must be positive")
        if end_tick < start_tick:
            raise ValueError("end_tick must be >= start_tick")
        out: list[tuple[int, float]] = []
        tick = start_tick
        while tick < end_tick:
            out.append((tick, self.value_at(tick)))
            tick += step_tick
        out.append((end_tick, self.value_at(end_tick)))
        return out

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "parameter": self.parameter,
            "points": [p.to_dict() for p in self.sorted_points()],
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> ExpressionCurve:
        return cls(
            id=data["id"],
            parameter=data["parameter"],
            points=[CurvePoint.from_dict(p) for p in data.get("points", [])],
        )
