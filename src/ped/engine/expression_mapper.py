"""Turn a Track's expression curves into MIDI CC events via an InstrumentProfile.

For each CC mapping in the profile, find the matching expression curve on the
track, sample it across the track's tick span, push each normalized sample
through the mapping's calibration curve, optionally smooth, and emit CC events.

Consecutive duplicate CC values are dropped to keep the stream compact.
"""

from __future__ import annotations

from typing import Optional

from ..core.track import Track
from ..midi.events import CCEvent
from ..profiles.instrument_profile import InstrumentProfile
from .smoothing import one_pole

DEFAULT_STEP_TICK = 60  # CC resolution; with ppq=960 this is 1/64-note granularity.


def _ms_per_tick(ppq: int, bpm: float) -> float:
    # quarter = 60000/bpm ms; one tick = quarter / ppq.
    return (60000.0 / bpm) / ppq


def map_track_to_cc(
    track: Track,
    profile: InstrumentProfile,
    ppq: int = 960,
    bpm: float = 120.0,
    step_tick: int = DEFAULT_STEP_TICK,
    channel: int = 0,
) -> list[CCEvent]:
    """Generate CC events for ``track`` using ``profile``."""
    start, end = track.tick_span()
    if end <= start:
        return []

    dt_ms = _ms_per_tick(ppq, bpm) * step_tick
    events: list[CCEvent] = []

    for mapping in profile.cc_mappings:
        cc = mapping.cc_number
        if cc is None:
            continue  # non-CC targets are handled elsewhere (keyswitch / PC)
        curve = track.curve_for(mapping.internal_parameter)
        if curve is None:
            continue

        calibration = (
            profile.calibration_by_id(mapping.curve_id) if mapping.curve_id else None
        )
        samples = curve.sample(start, end, step_tick)
        norm_values = [v for _, v in samples]
        norm_values = one_pole(norm_values, dt_ms, mapping.smoothing_ms)

        last_value: Optional[int] = None
        for (tick, _), norm in zip(samples, norm_values):
            cc_value = calibration.map(norm) if calibration else int(round(norm * 127))
            cc_value = max(0, min(127, cc_value))
            if cc_value != last_value:
                events.append(CCEvent(tick=tick, cc=cc, value=cc_value, channel=channel))
                last_value = cc_value

    events.sort()
    return events
