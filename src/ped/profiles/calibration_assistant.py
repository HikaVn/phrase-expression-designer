"""Calibration Assistant (spec §9.5, manual stage).

Build a CalibrationCurve from measured dynamic levels (ppp..fff). The user plays
each dynamic on the real instrument, reads the CC value that sounds right, and
records it; this turns that table into a normalized intent -> CC curve.

Dynamic levels are placed at canonical normalized positions across 0.0-1.0, so a
partial table (e.g. just p / mf / ff) still lands in musically sensible spots.

Future (not here): CC sweep playback + audio (RMS/LUFS) analysis to suggest
values automatically.
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
