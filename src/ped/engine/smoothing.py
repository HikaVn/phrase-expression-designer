"""Simple smoothing for sampled CC streams.

A one-pole low-pass over evenly-spaced samples. ``smoothing_ms`` sets the time
constant; 0 disables smoothing. Used to keep generated CC from stepping harshly.
"""

from __future__ import annotations

import math


def one_pole(values: list[float], dt_ms: float, smoothing_ms: float) -> list[float]:
    """One-pole low-pass filter. Returns a new list the same length as ``values``."""
    if smoothing_ms <= 0.0 or dt_ms <= 0.0 or len(values) < 2:
        return list(values)
    # Time-constant -> per-sample coefficient.
    alpha = 1.0 - math.exp(-dt_ms / smoothing_ms)
    out: list[float] = []
    prev = values[0]
    for v in values:
        prev = prev + alpha * (v - prev)
        out.append(prev)
    return out
