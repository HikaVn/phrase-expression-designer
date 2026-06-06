import plistlib
from xml.etree import ElementTree as ET

from ped.exporters.cubase import build_expression_map, export_cubase_expression_map
from ped.exporters.logic import build_articulation_set, export_logic_articulation_set
from ped.profiles.instrument_profile import InstrumentProfile

EXAMPLE = "examples/profiles/example_kontakt_strings_vln1.json"


def load():
    return InstrumentProfile.load(EXAMPLE)


def test_logic_set_contains_articulations_and_keyswitches():
    data = build_articulation_set(load())
    names = {a["Name"] for a in data["Articulations"]}
    assert {"Legato", "Sustain", "Spiccato"} <= names
    # legato keyswitch note 24 present in a switch row
    notes = {s["Note"] for s in data["Switches"]}
    assert 24 in notes


def test_logic_file_is_valid_plist(tmp_path):
    out = tmp_path / "set.plist"
    export_logic_articulation_set(load(), out)
    parsed = plistlib.loads(out.read_bytes())
    assert parsed["Articulations"]
    assert parsed["Switches"]


def test_cubase_map_has_slots_and_keyswitch():
    root = build_expression_map(load())
    assert root.tag == "InstrumentMap"
    slots = root.findall(".//obj[@class='PSoundSlot']")
    assert len(slots) == 3
    # at least one remote keyswitch action with data1=24
    data1_values = {
        e.get("value")
        for e in root.findall(".//obj[@class='PSlotMidiAction']/int[@name='data1']")
    }
    assert "24" in data1_values


def test_cubase_file_parses_as_xml(tmp_path):
    out = tmp_path / "map.expressionmap"
    export_cubase_expression_map(load(), out)
    tree = ET.parse(out)
    assert tree.getroot().tag == "InstrumentMap"


def test_c4_naming_resolves_in_export():
    # Spitfire-style profile uses C4=60; keyswitch C1 -> MIDI 24.
    profile = InstrumentProfile.load("examples/profiles/example_spitfire_style_strings.json")
    data = build_articulation_set(profile)
    assert 24 in {s["Note"] for s in data["Switches"]}
