"""Export an InstrumentProfile to a Cubase-style Expression Map (.expressionmap).

Cubase Expression Maps are Steinberg XML (``InstrumentMap`` with ``SoundSlot``
entries). This writes a structurally valid expression map capturing each
articulation as a sound slot whose remote-key trigger is the keyswitch note — a
starting point to import and refine in Cubase. No Cubase project is touched.

Only keyswitch-triggered articulations get a remote key; others still appear as
slots without one.
"""

from __future__ import annotations

from pathlib import Path
from xml.etree import ElementTree as ET

from ..profiles.instrument_profile import InstrumentProfile
from ..profiles.pitch_compat import resolve_keyswitch_note


def _member(parent: ET.Element, name: str) -> ET.Element:
    return ET.SubElement(parent, "member", {"name": name})


def _string(parent: ET.Element, name: str, value: str) -> None:
    ET.SubElement(parent, "string", {"name": name, "value": value, "wide": "true"})


def _int(parent: ET.Element, name: str, value: int) -> None:
    ET.SubElement(parent, "int", {"name": name, "value": str(value)})


def build_expression_map(profile: InstrumentProfile) -> ET.Element:
    """Build the XML tree (root ``InstrumentMap``) for a Cubase Expression Map."""
    root = ET.Element("InstrumentMap")
    name = profile.library or profile.id

    name_member = _member(root, "name")
    _string(name_member, "string", name)

    slots_member = _member(root, "slots")
    slots = ET.SubElement(slots_member, "list", {"name": "Slot", "type": "obj"})

    for art in profile.articulations:
        slot = ET.SubElement(slots, "obj", {"class": "PSoundSlot", "ID": art.id})
        _string(slot, "name", art.name)

        # Articulation descriptor.
        arts_member = _member(slot, "articulations")
        arts_list = ET.SubElement(arts_member, "list", {"name": "Slot", "type": "obj"})
        art_obj = ET.SubElement(arts_list, "obj", {"class": "PSlotArticulation"})
        _string(art_obj, "articulation", art.name)
        _int(art_obj, "articulationType", 0)

        trig = art.trigger
        if trig is not None and trig.type == "keyswitch":
            note = resolve_keyswitch_note(trig, profile.note_naming)
            if note is not None:
                remote = _member(slot, "remote")
                remote_list = ET.SubElement(remote, "list", {"name": "Slot", "type": "obj"})
                key = ET.SubElement(remote_list, "obj", {"class": "PSlotMidiAction"})
                _int(key, "status", 144)   # note-on
                _int(key, "data1", note)   # keyswitch note
                _int(key, "data2", 64)     # velocity
    return root


def export_cubase_expression_map(profile: InstrumentProfile, path: str | Path) -> None:
    """Write a Cubase-style Expression Map XML for ``profile``."""
    root = build_expression_map(profile)
    ET.indent(root, space="  ")
    xml = ET.tostring(root, encoding="unicode")
    Path(path).write_text('<?xml version="1.0" encoding="utf-8"?>\n' + xml + "\n", encoding="utf-8")
