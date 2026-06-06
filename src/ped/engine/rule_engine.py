"""Generate keyswitch events from the articulations attached to notes.

Latch keyswitches are emitted only when the active articulation changes (the
library holds the last one). Momentary keyswitches are emitted for every note
that uses them. Switches are placed slightly *before* the note so the library
has changed state by the time the note sounds.
"""

from __future__ import annotations

from ..core.track import Track
from ..midi.events import KeyswitchEvent
from ..profiles.instrument_profile import InstrumentProfile
from ..profiles.pitch_compat import resolve_keyswitch_note

DEFAULT_LEAD_TICK = 10  # place the keyswitch this many ticks before the note


def generate_keyswitches(
    track: Track,
    profile: InstrumentProfile,
    lead_tick: int = DEFAULT_LEAD_TICK,
    channel: int = 0,
) -> list[KeyswitchEvent]:
    """Emit keyswitch events for ``track`` based on each note's articulation_id."""
    events: list[KeyswitchEvent] = []
    active_latched: int | None = None  # note number currently latched

    for note in sorted(track.notes, key=lambda n: n.start_tick):
        if note.articulation_id is None:
            continue
        art = profile.articulation_by_id(note.articulation_id)
        if art is None or art.trigger is None or art.trigger.type != "keyswitch":
            continue
        ks_note = resolve_keyswitch_note(art.trigger, profile.note_naming)
        if ks_note is None:
            continue

        momentary = art.trigger.mode == "momentary"
        if not momentary and ks_note == active_latched:
            continue  # already latched, nothing to send

        tick = max(0, note.start_tick - lead_tick)
        events.append(KeyswitchEvent(tick=tick, note=ks_note, channel=channel))
        if not momentary:
            active_latched = ks_note

    events.sort()
    return events
