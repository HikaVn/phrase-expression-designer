"""Calibration Assistant (spec §9.5, manual stage).

Build a CalibrationCurve from measured dynamic levels (ppp..fff). The user plays
each dynamic on the real instrument, reads the CC value that sounds right, and
records it; this turns that table into a normalized intent -> CC curve.

Dynamic levels are placed at canonical normalized positions across 0.0-1.0, so a
partial table (e.g. just p / mf / ff) still lands in musically sensible spots.

It can also *invert a measured response*: given how loud each CC value actually
sounds (any monotonic scalar — RMS, LUFS, dB, peak), it builds a curve mapping
perceived intent (0.0-1.0) back to the CC that produces it, so equal steps in
intent give equal steps in measured loudness. The measurement itself is
audio-agnostic; actual audio decode/level extraction is still future work.
"""

from __future__ import annotations

from .calibration import CalibrationCurve, CalibrationPoint

# Soft -> loud. Canonical position of level i is i / (len - 1).
DYNAMIC_LEVELS = ["ppp", "pp", "p", "mp", "mf", "f", "ff", "fff"]
_INDEX = {name: i for i, name in enumerate(DYNAMIC_LEVELS)}
_SPAN = len(DYNAMIC_LEVELS) - 1


def dynamic_position(level: str) -> float:
    """Normalized 0.0-1.0 input position for a dynamic marking."""
    try:
        return _INDEX[level] / _SPAN
    except KeyError as exc:
        raise ValueError(
            f"Unknown dynamic {level!r}; expected one of {DYNAMIC_LEVELS}"
        ) from exc


def build_from_dynamics(
    curve_id: str,
    levels: dict[str, int],
    interpolation: str = "monotonic",
) -> CalibrationCurve:
    """Build a CalibrationCurve from a {dynamic: cc_value} table.

    Raises ValueError on an empty table, an unknown dynamic, or a CC value
    outside 0-127.
    """
    if not levels:
        raise ValueError("Need at least one dynamic level")
    points: list[CalibrationPoint] = []
    for level, value in levels.items():
        if not 0 <= value <= 127:
            raise ValueError(f"CC value for {level!r} is {value}, outside 0-127")
        points.append(CalibrationPoint(input=dynamic_position(level), output=value))
    points.sort(key=lambda p: p.input)
    return CalibrationCurve(id=curve_id, points=points, interpolation=interpolation)


def parse_levels(spec: str) -> dict[str, int]:
    """Parse a 'ppp=8,p=35,mf=68,ff=110' string into a dict."""
    out: dict[str, int] = {}
    for chunk in spec.split(","):
        chunk = chunk.strip()
        if not chunk:
            continue
        if "=" not in chunk:
            raise ValueError(f"Bad level spec {chunk!r}; expected name=value")
        name, _, value = chunk.partition("=")
        out[name.strip()] = int(value.strip())
    return out


def build_from_measurements(
    curve_id: str,
    measurements: dict[int, float],
    interpolation: str = "monotonic",
) -> CalibrationCurve:
    """Invert a measured CC->loudness response into an intent->CC calibration curve.

    ``measurements`` maps a CC value (0-127) to the measured level it produced
    (any monotonic scalar). The level range is normalized to 0.0-1.0 and used as
    the curve input, so asking for normalized loudness ``x`` returns the CC that
    produces it. The response should be (weakly) monotonic in CC.

    Raises ValueError if fewer than two points, a CC is out of range, or all
    measured levels are equal (no usable range).
    """
    if len(measurements) < 2:
        raise ValueError("Need at least two measurements to invert a response")
    for cc in measurements:
        if not 0 <= cc <= 127:
            raise ValueError(f"CC value {cc} outside 0-127")
    levels = list(measurements.values())
    lo, hi = min(levels), max(levels)
    if hi == lo:
        raise ValueError("All measured levels are equal; no usable range")
    points = [
        CalibrationPoint(input=(level - lo) / (hi - lo), output=cc)
        for cc, level in measurements.items()
    ]
    points.sort(key=lambda p: p.input)
    return CalibrationCurve(id=curve_id, points=points, interpolation=interpolation)


def parse_measurements(spec: str) -> dict[int, float]:
    """Parse a '0=-60,32=-40,64=-28,96=-18,127=-10' string into {cc: level}."""
    out: dict[int, float] = {}
    for chunk in spec.split(","):
        chunk = chunk.strip()
        if not chunk:
            continue
        if "=" not in chunk:
            raise ValueError(f"Bad measurement {chunk!r}; expected cc=level")
        cc, _, level = chunk.partition("=")
        out[int(cc.strip())] = float(level.strip())
    return out
