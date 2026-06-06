"""CalibrationCurve: maps a normalized intent value (0.0-1.0) to a MIDI CC value.

This is where the per-instrument "feel" lives. Two libraries given the same
intensity=0.5 often need very different CC1 values to sound equally loud; the
calibration curve absorbs that difference so the intent data stays portable.

Two interpolation modes:

    "linear"     piecewise-linear between control points.
    "monotonic"  Fritsch-Carlson monotone cubic Hermite spline -- a smooth curve
                 that never overshoots or wiggles between monotonic points.

Output is rounded and clamped to the curve's outputRange and to 0-127.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any

VALID_INTERPOLATIONS = ("linear", "monotonic")


def _fritsch_carlson_tangents(xs: list[float], ys: list[float]) -> list[float]:
    """Monotone-preserving tangents for Hermite interpolation (Fritsch-Carlson)."""
    n = len(xs)
    if n < 2:
        return [0.0] * n
    deltas = [(ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]) for i in range(n - 1)]
    m = [0.0] * n
    m[0] = deltas[0]
    m[-1] = deltas[-1]
    for i in range(1, n - 1):
        if deltas[i - 1] * deltas[i] <= 0:
            m[i] = 0.0  # local extremum -> flatten to avoid overshoot
        else:
            m[i] = (deltas[i - 1] + deltas[i]) / 2.0
    for i in range(n - 1):
        if deltas[i] == 0:
            m[i] = 0.0
            m[i + 1] = 0.0
            continue
        alpha = m[i] / deltas[i]
        beta = m[i + 1] / deltas[i]
        s = alpha * alpha + beta * beta
        if s > 9.0:
            tau = 3.0 / math.sqrt(s)
            m[i] = tau * alpha * deltas[i]
            m[i + 1] = tau * beta * deltas[i]
    return m


def _hermite(x: float, x0: float, x1: float, y0: float, y1: float, m0: float, m1: float) -> float:
    h = x1 - x0
    if h == 0:
        return y0
    t = (x - x0) / h
    t2 = t * t
    t3 = t2 * t
    h00 = 2 * t3 - 3 * t2 + 1
    h10 = t3 - 2 * t2 + t
    h01 = -2 * t3 + 3 * t2
    h11 = t3 - t2
    return h00 * y0 + h10 * h * m0 + h01 * y1 + h11 * h * m1


@dataclass
class CalibrationPoint:
    input: float
    output: int

    def to_dict(self) -> dict[str, Any]:
        return {"input": self.input, "output": self.output}

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> CalibrationPoint:
        return cls(input=float(data["input"]), output=int(data["output"]))


@dataclass
class CalibrationCurve:
    id: str
    points: list[CalibrationPoint] = field(default_factory=list)
    input_range: tuple[float, float] = (0.0, 1.0)
    output_range: tuple[int, int] = (0, 127)
    interpolation: str = "monotonic"

    def __post_init__(self) -> None:
        if self.interpolation not in VALID_INTERPOLATIONS:
            raise ValueError(
                f"Unknown interpolation {self.interpolation!r}; "
                f"expected one of {VALID_INTERPOLATIONS}"
            )

    def _sorted(self) -> list[CalibrationPoint]:
        return sorted(self.points, key=lambda p: p.input)

    def map(self, value: float) -> int:
        """Map a normalized ``value`` to an integer CC value, clamped to 0-127."""
        lo_out, hi_out = self.output_range
        out_min, out_max = min(lo_out, hi_out), max(lo_out, hi_out)
        pts = self._sorted()
        if not pts:
            # Identity-ish fallback across the output range.
            mapped = lo_out + (hi_out - lo_out) * value
        elif value <= pts[0].input:
            mapped = float(pts[0].output)
        elif value >= pts[-1].input:
            mapped = float(pts[-1].output)
        else:
            xs = [p.input for p in pts]
            ys = [float(p.output) for p in pts]
            tangents = (
                _fritsch_carlson_tangents(xs, ys)
                if self.interpolation == "monotonic"
                else None
            )
            mapped = ys[-1]
            for i in range(len(pts) - 1):
                if xs[i] <= value <= xs[i + 1]:
                    if tangents is not None:
                        mapped = _hermite(
                            value, xs[i], xs[i + 1], ys[i], ys[i + 1],
                            tangents[i], tangents[i + 1],
                        )
                    else:
                        span = xs[i + 1] - xs[i]
                        t = 0.0 if span == 0 else (value - xs[i]) / span
                        mapped = ys[i] + (ys[i + 1] - ys[i]) * t
                    break
        result = int(round(mapped))
        result = max(out_min, min(out_max, result))
        return max(0, min(127, result))

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "inputRange": list(self.input_range),
            "outputRange": list(self.output_range),
            "interpolation": self.interpolation,
            "points": [p.to_dict() for p in self._sorted()],
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> CalibrationCurve:
        in_range = data.get("inputRange", [0.0, 1.0])
        out_range = data.get("outputRange", [0, 127])
        return cls(
            id=data["id"],
            points=[CalibrationPoint.from_dict(p) for p in data.get("points", [])],
            input_range=(float(in_range[0]), float(in_range[1])),
            output_range=(int(out_range[0]), int(out_range[1])),
            interpolation=data.get("interpolation", "monotonic"),
        )
