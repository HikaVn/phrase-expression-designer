"""CalibrationCurve: maps a normalized intent value (0.0-1.0) to a MIDI CC value.

This is where the per-instrument "feel" lives. Two libraries given the same
intensity=0.5 often need very different CC1 values to sound equally loud; the
calibration curve absorbs that difference so the intent data stays portable.

Interpolation is piecewise-linear between control points. With monotonic
control points (the normal case) the result is itself monotonic. Output is
rounded and clamped to the curve's outputRange and to 0-127.

TODO: a true monotone-cubic ("monotonic") interpolation; for now "monotonic"
and "linear" both use the piecewise-linear path.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

VALID_INTERPOLATIONS = ("linear", "monotonic")


@dataclass
class CalibrationPoint:
    input: float
    output: int

    def to_dict(self) -> dict[str, Any]:
        return {"input": self.input, "output": self.output}

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "CalibrationPoint":
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
            mapped = float(pts[-1].output)
            for left, right in zip(pts, pts[1:]):
                if left.input <= value <= right.input:
                    span = right.input - left.input
                    t = 0.0 if span == 0 else (value - left.input) / span
                    mapped = left.output + (right.output - left.output) * t
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
    def from_dict(cls, data: dict[str, Any]) -> "CalibrationCurve":
        in_range = data.get("inputRange", [0.0, 1.0])
        out_range = data.get("outputRange", [0, 127])
        return cls(
            id=data["id"],
            points=[CalibrationPoint.from_dict(p) for p in data.get("points", [])],
            input_range=(float(in_range[0]), float(in_range[1])),
            output_range=(int(out_range[0]), int(out_range[1])),
            interpolation=data.get("interpolation", "monotonic"),
        )
