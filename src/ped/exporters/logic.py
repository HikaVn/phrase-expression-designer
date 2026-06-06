"""Export an InstrumentProfile to a Logic Pro-style Articulation Set (.plist).

Logic's Articulation Set is a property list with an ``Articulations`` array
(name + id + symbol) and a ``Switches`` array describing how each articulation is
selected (here: a keyswitch note). This writes a valid plist capturing
articulation names, ids and keyswitch notes — a starting point you import into
Logic and refine for your exact version. It is intentionally a DAW-independent
export: no Logic project is touched (spec §17.2).

Only keyswitch-triggered articulations get a switch entry; cc / program_change
articulations are still listed (without a keyswitch row).
"""

from __future__ import annotations

import plistlib
from pathlib import Path
from typing import Any

from ..profiles.instrument_profile import InstrumentProfile
from ..profiles.pitch_compat import resolve_keyswitch_note

# Logic switch type: 1 == keyswitch note (per Logic's Articulation Set schema).
_SWITCH_TYPE_KEYSWITCH = 1


def build_articulation_set(profile: InstrumentProfile) -> dict[str, Any]:
    """Build the plist-ready dict for a Logic Articulation Set."""
    articulations: list[dict[str, Any]] = []
    switches: list[dict[str, Any]] = []

    for index, art in enumerate(profile.articulations, start=1):
        articulations.append({
            "ID": index,
            "Name": art.name,
            "Symbol": 0,
            "Output": 0,
        })
        trig = art.trigger
        if trig is not None and trig.type == "keyswitch":
            note = resolve_keyswitch_note(trig, profile.note_naming)
            if note is not None:
                switches.append({
                    "ID": index,
                    "Type": _SWITCH_TYPE_KEYSWITCH,
                    "Note": note,
                    "MIDIChannel": 0,
                })

    name = profile.library or profile.id
    if profile.patch:
        name = f"{name} - {profile.patch}"
    return {"Name": name, "Articulations": articulations, "Switches": switches}


def export_logic_articulation_set(profile: InstrumentProfile, path: str | Path) -> None:
    """Write a Logic-style Articulation Set plist for ``profile``."""
    data = build_articulation_set(profile)
    Path(path).write_bytes(plistlib.dumps(data))
