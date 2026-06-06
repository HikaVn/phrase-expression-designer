"""Lightweight MIDI event records used between the engine and the MIDI writer.

These are intentionally tick-based and DAW-independent; the writer converts them
to delta-time mido messages.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(order=True)
class CCEvent:
    tick: int
    cc: int
    value: int  # 0-127
    channel: int = 0


@dataclass(order=True)
class KeyswitchEvent:
    """A keyswitch note. ``duration_tick`` is the on->off gap (short for a tap)."""

    tick: int
    note: int
    velocity: int = 100
    duration_tick: int = 1
    channel: int = 0
