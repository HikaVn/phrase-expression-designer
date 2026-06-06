"""Generate articulation-switch events from the articulations attached to notes.

Handles all trigger types:

    keyswitch        -> KeyswitchEvent (a short note in the keyswitch range)
    cc               -> CCEvent (control + value)
    program_change   -> ProgramChangeEvent

Latch triggers are emitted only when the active articulation changes (the
library holds the last one). Momentary keyswitches are emitted for every note.
Switches are placed slightly *before* the note so the library has changed state
by the time the note sounds.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from ..core.track import Track
from ..midi.events import CCEvent, KeyswitchEvent, ProgramChangeEvent
from ..profiles.instrument_profile import InstrumentProfile
from ..profiles.pitch_compat import resolve_keyswitch_note

DEFAULT_LEAD_TICK = 10  # place the switch this many ticks before the note


@dataclass
class ArticulationEvents:
    keyswitches: list[KeyswitchEvent] = field(default_factory=list)
    cc_events: list[CCEvent] = field(default_factory=list)
    program_changes: list[ProgramChangeEvent] = field(default_factory=list)


def generate_articulation_events(
    track: Track,
    profile: InstrumentProfile,
    lead_tick: int = DEFAULT_LEAD_TICK,
    channel: int = 0,
) -> ArticulationEvents:
    """Emit switch events for ``track`` based on each note's articulation_id."""
    out = ArticulationEvents()
    active_art: str | None = None

    for note in sorted(track.notes, key=lambda n: n.start_tick):
        if note.articulation_id is None:
            continue
        art = profile.articulation_by_id(note.articulation_id)
        if art is None or art.trigger is None:
            continue
        trig = art.trigger
        momentary = trig.mode == "momentary"
        if not momentary and note.articulation_id == active_art:
            continue  # already active, nothing to send

        tick = max(0, note.start_tick - lead_tick)
        if trig.type == "keyswitch":
            ks_note = resolve_keyswitch_note(trig, profile.note_naming)
            if ks_note is None:
                continue
            out.keyswitches.append(KeyswitchEvent(tick=tick, note=ks_note, channel=channel))
        elif trig.type == "cc" and trig.cc is not None:
            value = trig.value if trig.value is not None else 127
            out.cc_events.append(
                CCEvent(tick=tick, cc=trig.cc, value=max(0, min(127, value)), channel=channel)
            )
        elif trig.type == "program_change" and trig.program is not None:
            out.program_changes.append(
                ProgramChangeEvent(tick=tick, program=trig.program, channel=channel)
            )
        else:
            continue

        if not momentary:
            active_art = note.articulation_id

    out.keyswitches.sort()
    out.cc_events.sort()
    out.program_changes.sort()
    return out


def generate_keyswitches(
    track: Track,
    profile: InstrumentProfile,
    lead_tick: int = DEFAULT_LEAD_TICK,
    channel: int = 0,
) -> list[KeyswitchEvent]:
    """Backward-compatible helper: only the keyswitch events."""
    return generate_articulation_events(track, profile, lead_tick, channel).keyswitches
