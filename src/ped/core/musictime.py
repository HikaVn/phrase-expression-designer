"""Musical (bar:beat) <-> tick conversion.

A position is written ``bar:beat`` or ``bar:beat:tick`` (all 1-based for bar and
beat; ``tick`` is a 0-based offset within the beat). Time signatures are held as
``TimeSignature`` segments that begin at a given 1-based bar; if no segment
starts at bar 1 a 4/4 default is assumed.

A "beat" is one unit of the time-signature denominator: in n/d a beat is a 1/d
note = ``ppq * 4 / d`` ticks, and there are ``n`` beats per bar.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class TimeSignature:
    start_bar: int  # 1-based bar where this signature takes effect
    numerator: int = 4
    denominator: int = 4

    def beat_ticks(self, ppq: int) -> int:
        return ppq * 4 // self.denominator

    def bar_ticks(self, ppq: int) -> int:
        return self.beat_ticks(ppq) * self.numerator

    def to_dict(self) -> dict[str, Any]:
        return {
            "startBar": self.start_bar,
            "numerator": self.numerator,
            "denominator": self.denominator,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> TimeSignature:
        return cls(
            start_bar=int(data.get("startBar", 1)),
            numerator=int(data.get("numerator", 4)),
            denominator=int(data.get("denominator", 4)),
        )


_DEFAULT = TimeSignature(1, 4, 4)


def normalize_map(ts_map: list[TimeSignature] | None) -> list[TimeSignature]:
    """Return a sorted map guaranteed to start at bar 1."""
    items = sorted(ts_map or [], key=lambda t: t.start_bar)
    if not items or items[0].start_bar > 1:
        items = [_DEFAULT, *items]
    return items


def _segment_for_bar(ts_map: list[TimeSignature], bar: int) -> TimeSignature:
    current = ts_map[0]
    for ts in ts_map:
        if ts.start_bar <= bar:
            current = ts
        else:
            break
    return current


def bar_start_tick(bar: int, ppq: int, ts_map: list[TimeSignature] | None = None) -> int:
    """Absolute tick at the downbeat of ``bar`` (1-based)."""
    if bar < 1:
        raise ValueError("bar must be >= 1")
    segments = normalize_map(ts_map)
    tick = 0
    for b in range(1, bar):
        tick += _segment_for_bar(segments, b).bar_ticks(ppq)
    return tick


def parse_position(text: str) -> tuple[int, int, int]:
    """Parse 'bar', 'bar:beat', or 'bar:beat:tick' into (bar, beat, tick)."""
    parts = text.strip().split(":")
    if not 1 <= len(parts) <= 3:
        raise ValueError(f"Bad position {text!r}; expected bar[:beat[:tick]]")
    try:
        bar = int(parts[0])
        beat = int(parts[1]) if len(parts) > 1 else 1
        tick = int(parts[2]) if len(parts) > 2 else 0
    except ValueError as exc:
        raise ValueError(f"Bad position {text!r}: {exc}") from exc
    if bar < 1 or beat < 1 or tick < 0:
        raise ValueError(f"Position {text!r}: bar/beat are 1-based, tick >= 0")
    return bar, beat, tick


def position_to_tick(
    text: str, ppq: int, ts_map: list[TimeSignature] | None = None
) -> int:
    """Convert a 'bar:beat[:tick]' string to an absolute tick."""
    bar, beat, off = parse_position(text)
    segments = normalize_map(ts_map)
    ts = _segment_for_bar(segments, bar)
    return bar_start_tick(bar, ppq, segments) + (beat - 1) * ts.beat_ticks(ppq) + off


def tick_to_position(
    tick: int, ppq: int, ts_map: list[TimeSignature] | None = None
) -> tuple[int, int, int]:
    """Inverse of :func:`position_to_tick`; returns (bar, beat, tick_offset)."""
    if tick < 0:
        raise ValueError("tick must be >= 0")
    segments = normalize_map(ts_map)
    bar = 1
    acc = 0
    while True:
        bar_len = _segment_for_bar(segments, bar).bar_ticks(ppq)
        if acc + bar_len > tick:
            break
        acc += bar_len
        bar += 1
    ts = _segment_for_bar(segments, bar)
    within = tick - acc
    beat = within // ts.beat_ticks(ppq) + 1
    off = within % ts.beat_ticks(ppq)
    return bar, beat, off
